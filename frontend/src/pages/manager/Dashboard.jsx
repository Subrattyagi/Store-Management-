import { useState, useEffect } from 'react';
import { reportsAPI, assignmentsAPI, assetsAPI, assetRequestsAPI } from '../../api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatusBadge from '../../components/StatusBadge';

const COLORS = { available: '#10b981', issued: '#6366f1', return_requested: '#f59e0b', under_maintenance: '#ef4444', lost: '#f43f5e' };

const CATEGORIES = ['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard', 'Peripheral', 'Furniture', 'Other'];
const URGENCY_META = {
    low: { label: 'Low', color: '#10b981', bg: '#10b98115' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b15' },
    high: { label: 'High', color: '#ef4444', bg: '#ef444415' },
};

/* ─── Asset History Modal (used by Manager) ─── */
function AssetHistoryModal({ assetId, assetName, serialNumber, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await assetsAPI.getHistory(assetId);
                setHistory(res.data.data.history);
            } catch {
                toast.error('Failed to load asset history');
            } finally {
                setLoading(false);
            }
        })();
    }, [assetId]);

    function fmt(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 780, width: '95vw' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3 style={{ marginBottom: '0.2rem' }}>Assignment History</h3>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {assetName}&nbsp;
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4 }}>{serialNumber}</span>
                        </span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2.5rem 0' }}>
                            <div className="empty-icon">🕐</div>
                            <h3>No assignment history yet</h3>
                            <p>This asset has not been issued to any employee yet.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 500 }}>
                                {history.length} record{history.length !== 1 ? 's' : ''} · oldest first
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}>#</th>
                                            <th>Employee</th>
                                            <th>Department</th>
                                            <th>Assigned By</th>
                                            <th>Issue Date</th>
                                            <th>Return Date</th>
                                            <th>Condition</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h, idx) => {
                                            const isLast = idx === history.length - 1;
                                            const initials = h.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                                            return (
                                                <tr key={h._id} style={{
                                                    background: isLast && h.status === 'issued' ? 'rgba(245,158,11,0.04)' : '',
                                                    borderLeft: isLast && h.status === 'issued' ? '3px solid #f59e0b' : '3px solid transparent',
                                                }}>
                                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>{idx + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0 }}>
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{h.employee?.name || '—'}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{h.employee?.email || ''}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{h.employee?.department || '—'}</td>
                                                    <td style={{ fontSize: '0.82rem', fontWeight: 500 }}>{h.assignedBy?.name || '—'}</td>
                                                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmt(h.createdAt)}</td>
                                                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                        {h.status === 'returned' ? fmt(h.updatedAt) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                    <td>
                                                        {h.returnCondition ? <StatusBadge status={h.returnCondition} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                                                    </td>
                                                    <td><StatusBadge status={h.status} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ─── Reports Modal (used by Manager) ─── */
function ReportsModal({ type, data, onClose }) {
    const title = type === 'returnRequested' ? 'All Pending Returns' : 'All Lost Asset Reports';
    const icon = type === 'returnRequested' ? '✨' : '🛡️';
    const badgeColor = type === 'returnRequested' ? '#f59e0b' : '#ef4444';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 800, width: '95vw' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ background: type === 'returnRequested' ? '#fef3c7' : '#fee2e2', padding: '4px', borderRadius: '6px' }}>{icon}</span> {title}
                        </h3>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{data.length} total records</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Asset</th>
                                    <th>Employee</th>
                                    <th>Date</th>
                                    <th>Status / Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(a => (
                                    <tr key={a._id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{a.asset?.name}</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>{a.asset?.serialNumber}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{a.employee?.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.employee?.email || '—'}</div>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{new Date(a.updatedAt).toLocaleDateString()}</td>
                                        <td>
                                            {type === 'returnRequested' ? (
                                                <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Pending Return</span>
                                            ) : (
                                                <div>
                                                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Lost Item</span>
                                                    {a.notes && <div style={{ fontSize: '0.8rem', color: '#be123c', fontStyle: 'italic', marginTop: '4px' }}>"{a.notes}"</div>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}

/* ─── Request Form Modal (used by Manager) ─── */
function RequestFormModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({ assetCategory: '', assetDescription: '', urgency: 'medium' });
    const [submitting, setSubmitting] = useState(false);

    const handle = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await assetRequestsAPI.create(form);
            toast.success('Asset request submitted! The Store Manager has been notified.');
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
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Request an Asset for Yourself</h3>
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

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.625rem 0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{payload[0].name.replace(/_/g, ' ')}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{payload[0].value} assets</div>
        </div>
    );
};

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [assignments, setAssignments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [viewAllTarget, setViewAllTarget] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [summaryRes, assignmentsRes] = await Promise.all([
                    reportsAPI.getSummary(),
                    assignmentsAPI.getAll()
                ]);
                setSummary(summaryRes.data.data);
                setAssignments(assignmentsRes.data.data.assignments);
            } catch {
                toast.error('Failed to load dashboard metrics');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const { assetsByStatus = [], recentActivities = [] } = summary || {};
    const statusData = Object.entries(summary.byStatus || {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

    const returnRequested = assignments?.filter(a => a.status === 'return_requested') || [];
    const lostAssets = assignments?.filter(a => a.status === 'lost') || [];

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Manager Dashboard</h1>
                    <p>Live overview of assets and team metrics</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowRequestModal(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    &nbsp;Request Asset
                </button>
            </div>

            {historyTarget && (
                <AssetHistoryModal
                    assetId={historyTarget.assetId}
                    assetName={historyTarget.assetName}
                    serialNumber={historyTarget.serialNumber}
                    onClose={() => setHistoryTarget(null)}
                />
            )}

            {viewAllTarget && (
                <ReportsModal
                    type={viewAllTarget}
                    data={viewAllTarget === 'returnRequested' ? returnRequested : lostAssets}
                    onClose={() => setViewAllTarget(null)}
                />
            )}

            {showRequestModal && (
                <RequestFormModal
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={() => { }}
                />
            )}

            {/* Stat cards */}
            <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card accent">
                    <div className="stat-icon accent">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.totalAssets}</div>
                        <div className="stat-label">Total Assets</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.totalUsers}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>
                <div className="stat-card info">
                    <div className="stat-icon info">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.byStatus?.issued || 0}</div>
                        <div className="stat-label">Assets Issued</div>
                    </div>
                </div>
            </div>

            {/* Premium Compact Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Return Requests Compact Card */}
                <div className="card" style={{ padding: '1.25rem', borderTop: '3px solid #f59e0b', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    <div className="section-header" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#0f172a' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                                Pending Returns
                                {returnRequested.length > 0 && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>({returnRequested.length})</span>}
                            </div>
                        </div>
                        {returnRequested.length > 0 && (
                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setViewAllTarget('returnRequested')}>View All</button>
                        )}
                    </div>
                    {returnRequested.length === 0 ? (
                        <div className="empty-state" style={{ padding: '1rem 0', background: '#f8fafc', borderRadius: '6px' }}>
                            <span className="empty-icon" style={{ fontSize: '1.2rem', opacity: 0.5 }}>✨</span>
                            <h3 style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>No pending returns</h3>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <tbody>
                                    {returnRequested.map((a, idx) => (
                                        <tr key={a._id} style={{ borderBottom: idx !== returnRequested.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setHistoryTarget({ assetId: a.asset?._id, assetName: a.asset?.name, serialNumber: a.asset?.serialNumber })}>
                                            <td style={{ padding: '0.5rem 0.25rem', width: '2rem' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '6px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                    {a.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.25rem', color: '#1e293b', fontWeight: 500 }}>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{a.asset?.name}</div>
                                                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{a.employee?.name}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>
                                                <span style={{ fontFamily: 'monospace', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                    {a.asset?.serialNumber}
                                                </span>
                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Awaiting</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Lost Assets Compact Card */}
                <div className="card" style={{ padding: '1.25rem', borderTop: '3px solid #ef4444', background: '#fff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                    <div className="section-header" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', color: '#0f172a' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                                Lost Asset Reports
                                {lostAssets.length > 0 && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>({lostAssets.length})</span>}
                            </div>
                        </div>
                        {lostAssets.length > 0 && (
                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setViewAllTarget('lostAssets')}>View All</button>
                        )}
                    </div>
                    {lostAssets.length === 0 ? (
                        <div className="empty-state" style={{ padding: '1rem 0', background: '#f8fafc', borderRadius: '6px' }}>
                            <span className="empty-icon" style={{ fontSize: '1.2rem', opacity: 0.5 }}>🛡️</span>
                            <h3 style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>No lost assets</h3>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <tbody>
                                    {lostAssets.map((a, idx) => (
                                        <tr key={a._id} style={{ borderBottom: idx !== lostAssets.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => setHistoryTarget({ assetId: a.asset?._id, assetName: a.asset?.name, serialNumber: a.asset?.serialNumber })}>
                                            <td style={{ padding: '0.5rem 0.25rem', width: '2rem' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                    {a.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.25rem', color: '#881337', fontWeight: 500 }}>
                                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{a.asset?.name}</div>
                                                <div style={{ color: '#be123c', fontSize: '0.7rem', fontWeight: 400, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{a.employee?.name}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem 0.25rem', textAlign: 'right' }}>
                                                <span style={{ fontFamily: 'monospace', background: '#ffe4e6', color: '#9f1239', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                                    {a.asset?.serialNumber}
                                                </span>
                                                <div style={{ fontSize: '0.65rem', color: '#e11d48', marginTop: '2px' }}>{a.notes ? 'Notes added' : 'Reported lost'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="chart-card">
                <div className="section-header">
                    <div>
                        <div className="section-title">Asset Status Distribution</div>
                        <div className="section-subtitle">Breakdown of all {summary.totalAssets} assets by current status</div>
                    </div>
                </div>
                {statusData.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📊</span><h3>No data yet</h3><p>Add some assets to see the distribution chart.</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%" cy="50%"
                                innerRadius={90} outerRadius={130}
                                paddingAngle={3} dataKey="value"
                            >
                                {statusData.map((entry) => (
                                    <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={(value) => value.replace(/_/g, ' ')}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '0.8rem', textTransform: 'capitalize' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
