import { useState, useEffect } from 'react';
import { assignmentsAPI, assetRequestsAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const CATEGORIES = ['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard', 'Peripheral', 'Furniture', 'Other'];
const URGENCY_META = {
    low: { label: 'Low', color: '#10b981', bg: '#10b98115' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b15' },
    high: { label: 'High', color: '#ef4444', bg: '#ef444415' },
};

const STATUS_META = {
    pending_manager: { label: 'Pending Manager', color: '#6366f1', icon: '⏳' },
    rejected: { label: 'Rejected', color: '#ef4444', icon: '✕' },
    pending_store: { label: 'Approved — Pending Store', color: '#f59e0b', icon: '📦' },
    purchase_requested: { label: 'Purchase Initiated', color: '#a855f7', icon: '🛒' },
    assigned: { label: 'Assigned ✓', color: '#10b981', icon: '✅' },
};

function RequestFormModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({ assetCategory: '', assetDescription: '', urgency: 'medium' });
    const [submitting, setSubmitting] = useState(false);

    const handle = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await assetRequestsAPI.create(form);
            toast.success('Asset request submitted!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal premium-card" style={{ maxWidth: 480, border: 'none', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', background: 'rgba(255, 255, 255, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Request an Asset</h3>
                    <button className="modal-close" onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>×</button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    <form id="reqForm" onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Asset Category *</label>
                            <select className="form-select" value={form.assetCategory}
                                onChange={e => setForm({ ...form, assetCategory: e.target.value })} required>
                                <option value="" disabled>Choose a category…</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Description *</label>
                            <textarea className="form-input" rows={3}
                                placeholder="Describe what you need and why (e.g. laptop for field work, need 16GB RAM)…"
                                value={form.assetDescription}
                                onChange={e => setForm({ ...form, assetDescription: e.target.value })}
                                required style={{ resize: 'vertical' }} />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Urgency</label>
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                {['low', 'medium', 'high'].map(u => {
                                    const m = URGENCY_META[u];
                                    const active = form.urgency === u;
                                    return (
                                        <button key={u} type="button"
                                            onClick={() => setForm({ ...form, urgency: u })}
                                            style={{
                                                flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${active ? m.color : 'transparent'}`,
                                                background: active ? m.bg : 'var(--bg-secondary)',
                                                color: active ? m.color : 'var(--text-secondary)',
                                                fontWeight: active ? 700 : 500, cursor: 'pointer',
                                                fontSize: '0.85rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                boxShadow: active ? `0 4px 12px ${m.color}20` : 'none',
                                            }}>{m.label}</button>
                                    );
                                })}
                            </div>
                        </div>
                    </form>
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(226, 232, 240, 0.6)', background: 'rgba(255, 255, 255, 0.5)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="reqForm" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Submitting…' : 'Submit Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RequestTimeline({ request }) {
    if (!request) return null;

    // Define the 4 high-level steps
    const steps = [
        { id: 'requested', label: 'Requested', statuses: ['pending_manager'] },
        { id: 'manager_review', label: 'Manager Review', statuses: ['pending_store', 'purchase_requested', 'rejected', 'assigned'] },
        { id: 'store_processing', label: 'Store Processing', statuses: ['purchase_requested', 'assigned'] },
        { id: 'assigned', label: 'Assigned', statuses: ['assigned'] }
    ];

    const currentStatus = request.status;
    const isRejected = currentStatus === 'rejected';

    // Figure out the active step index based on backend status
    let activeStepIndex = 0;
    if (currentStatus === 'pending_manager') activeStepIndex = 0;
    else if (currentStatus === 'rejected') activeStepIndex = 1;
    else if (currentStatus === 'pending_store') activeStepIndex = 1;
    else if (currentStatus === 'purchase_requested') activeStepIndex = 2;
    // Both assigned and issued (or strictly assigned) means completed flow
    else if (currentStatus === 'assigned') activeStepIndex = 3;

    // Helper to find the matching timeline entry for a step to show meta info
    const getStepMeta = (stepId) => {
        if (!request.timeline) return null;
        if (stepId === 'requested') return request.timeline.find(t => t.status === 'pending_manager');
        if (stepId === 'manager_review') return request.timeline.find(t => ['pending_store', 'rejected'].includes(t.status));
        if (stepId === 'store_processing') return request.timeline.find(t => t.status === 'purchase_requested');
        if (stepId === 'assigned') return request.timeline.find(t => t.status === 'assigned');
        return null;
    };

    return (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>Request Status</h4>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {steps.map((step, index) => {
                    const isCompleted = isRejected ? index < activeStepIndex : index < activeStepIndex;
                    const isCurrent = index === activeStepIndex;
                    const isLast = index === steps.length - 1;

                    const meta = getStepMeta(step.id);
                    const stepIconColor = isRejected && isCurrent ? '#ef4444' : (isCompleted || isCurrent ? '#10b981' : '#cbd5e1');
                    const stepBgColor = isRejected && isCurrent ? '#fef2f2' : (isCompleted || isCurrent ? '#ecfdf5' : 'transparent');

                    return (
                        <div key={step.id} style={{ display: 'flex', position: 'relative' }}>
                            {/* Line connecting steps */}
                            {!isLast && (
                                <div style={{
                                    position: 'absolute', left: '11px', top: '24px', bottom: '-8px', width: '2px',
                                    background: (isCompleted && !isRejected) ? '#10b981' : '#e2e8f0',
                                    zIndex: 0
                                }} />
                            )}

                            {/* Step Indicator */}
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                background: stepBgColor, border: `2px solid ${stepIconColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 1, marginTop: '2px',
                                boxShadow: isCurrent && !isRejected ? '0 0 0 4px #ecfdf5' : (isCurrent && isRejected ? '0 0 0 4px #fef2f2' : 'none')
                            }}>
                                {isCompleted && !isRejected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                {isRejected && isCurrent && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                                {isCurrent && !isRejected && <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />}
                            </div>

                            {/* Step Content */}
                            <div style={{ marginLeft: '1rem', paddingBottom: isLast ? '0' : '2rem', flex: 1 }}>
                                <div style={{
                                    fontSize: '0.9rem', fontWeight: 700,
                                    color: (isCurrent || isCompleted) ? (isRejected && isCurrent ? '#ef4444' : 'var(--text)') : 'var(--text-muted)'
                                }}>
                                    {isRejected && isCurrent ? 'Request Rejected' : step.label}
                                </div>

                                {meta && (
                                    <div style={{ marginTop: '0.25rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                        {meta.note && <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontStyle: 'italic' }}>"{meta.note}"</div>}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600 }}>
                                            <span>Action by: {meta.by?.name || 'System'}</span>
                                            <span>Date: {new Date(meta.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MyAssets() {
    const [assignments, setAssignments] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('assets'); // 'assets' | 'requests'
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [expandedRequest, setExpandedRequest] = useState(null);

    const fetchData = async () => {
        try {
            const [aRes, rRes] = await Promise.all([
                assignmentsAPI.getAll(),
                assetRequestsAPI.getAll(),
            ]);
            setAssignments(aRes.data.data.assignments);
            setMyRequests(rRes.data.data.requests);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleReturnRequest = async (id) => {
        if (!window.confirm('Request a return for this asset?')) return;
        try {
            await assignmentsAPI.requestReturn(id);
            toast.success('Return requested successfully');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const handleReportLost = async (id) => {
        const reason = window.prompt('Describe how the asset was lost:');
        if (!reason) return;
        try {
            await assignmentsAPI.reportLost(id, { reason });
            toast.success('Asset reported as lost');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const CATEGORY_ICONS = {
        laptop: '💻', computer: '🖥️', phone: '📱', tablet: '📱',
        furniture: '🪑', vehicle: '🚗', equipment: '⚙️', accessory: '🎧',
    };
    const getIcon = (cat) => CATEGORY_ICONS[cat?.toLowerCase()] || '📦';

    const pendingCount = myRequests.filter(r => ['pending_manager', 'pending_store', 'purchase_requested'].includes(r.status)).length;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>My Assets</h1>
                    <p>Manage your assigned assets and track your requests</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Request an Asset
                </button>
            </div>

            {/* Tabs */}
            <div className="glass-panel" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', borderRadius: '999px', padding: '0.4rem', width: 'fit-content' }}>
                {[
                    { id: 'assets', label: `My Assets (${assignments.length})` },
                    { id: 'requests', label: `My Requests${pendingCount ? ` · ${pendingCount} active` : ` (${myRequests.length})`}` },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: '999px',
                            border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            background: tab === t.id ? 'var(--bg)' : 'transparent',
                            color: tab === t.id ? 'var(--text)' : 'var(--text-secondary)',
                            boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}>{t.label}
                    </button>
                ))}
            </div>

            {/* ── ASSETS TAB ── */}
            {tab === 'assets' && (
                assignments.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <span className="empty-icon">🎒</span>
                            <h3>No assets assigned</h3>
                            <p>You have no active assets. Use "Request an Asset" to request one from your manager.</p>
                        </div>
                    </div>
                ) : (
                    <div className="asset-cards-grid" style={{ gap: '1.5rem' }}>
                        {assignments.map((a) => (
                            <div key={a._id} className="premium-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                                {/* Glassy glow based on condition */}
                                <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: a.asset.condition === 'new' ? '#10b98130' : a.asset.condition?.includes('damage') ? '#f59e0b30' : '#6366f130', filter: 'blur(30px)', borderRadius: '50%', pointerEvents: 'none' }} />

                                <div className="asset-card-header" style={{ marginBottom: '1.25rem' }}>
                                    <div className="asset-card-icon" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: 48, height: 48, borderRadius: '12px' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{getIcon(a.asset.category)}</span>
                                    </div>
                                    <StatusBadge status={a.status} />
                                </div>
                                <div className="asset-card-name" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>{a.asset.name}</div>
                                <div className="asset-card-category" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.asset.category}</div>

                                <div className="asset-card-meta" style={{ marginTop: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                    <div className="asset-card-meta-row">
                                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Serial No.</span>
                                        <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>{a.asset.serialNumber}</span>
                                    </div>
                                    <div className="asset-card-meta-row">
                                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Condition</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 700, background: 'var(--bg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{a.asset.condition || '—'}</span>
                                    </div>
                                    <div className="asset-card-meta-row">
                                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Issued</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 700 }}>
                                            {new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                {a.status === 'issued' && (
                                    <>
                                        <div className="asset-card-actions" style={{ marginTop: '1.25rem', gap: '0.75rem' }}>
                                            <button className="btn btn-warning btn-sm" style={{ flex: 1, background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', fontWeight: 600 }} onClick={() => handleReturnRequest(a._id)}>Return Asset</button>
                                            <button className="btn btn-danger btn-sm" style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 600 }} onClick={() => handleReportLost(a._id)}>Report Lost</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── REQUESTS TAB ── */}
            {tab === 'requests' && (
                myRequests.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <span className="empty-icon">📋</span>
                            <h3>No requests yet</h3>
                            <p>Click "Request an Asset" to submit your first request.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {myRequests.map(r => {
                            const sm = STATUS_META[r.status] || { label: r.status, color: '#6366f1', icon: '●' };
                            const um = URGENCY_META[r.urgency];
                            const isExpanded = expandedRequest === r._id;
                            return (
                                <div key={r._id} className="premium-card" style={{ padding: '1.25rem 1.5rem', cursor: 'pointer' }}
                                    onClick={() => setExpandedRequest(isExpanded ? null : r._id)}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{r.assetCategory}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: um?.bg, color: um?.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{um?.label} Priority</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{r.assetDescription}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                Submitted {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                {sm.icon !== '●' && <span style={{ fontSize: '1.25rem' }}>{sm.icon}</span>}
                                                <span style={{ fontWeight: 700, color: sm.color }}>{sm.label}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '6px 14px', borderRadius: 999, background: `${sm.color}15`, color: sm.color, display: 'flex', alignItems: 'center', gap: '0.4em' }}>
                                                {sm.icon} {sm.label}
                                            </span>
                                            {r.managerNote && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 200, textAlign: 'right' }}>Note: {r.managerNote}</span>}
                                        </div>
                                    </div>
                                    <div style={{
                                        maxHeight: isExpanded ? '1000px' : '0',
                                        overflow: 'hidden',
                                        transition: 'max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        opacity: isExpanded ? 1 : 0
                                    }}>
                                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Timeline
                                            </div>
                                            <RequestTimeline request={r} />
                                            {r.assignedAsset && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.875rem', background: '#10b98112', borderRadius: 'var(--radius-sm)', border: '1px solid #10b98140' }}>
                                                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, marginBottom: '0.2rem' }}>✅ Asset Assigned</div>
                                                    <div style={{ fontWeight: 600 }}>{r.assignedAsset.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.assignedAsset.serialNumber}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {
                showRequestModal && (
                    <RequestFormModal onClose={() => setShowRequestModal(false)} onSuccess={fetchData} />
                )
            }
        </div >
    );
}
