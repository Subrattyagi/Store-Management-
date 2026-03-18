import { useState, useEffect } from 'react';
import { assetRequestsAPI, assetsAPI } from '../../api';
import toast from 'react-hot-toast';

const URGENCY_META = {
    low: { label: 'Low', color: '#10b981', bg: '#10b98115' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b15' },
    high: { label: 'High', color: '#ef4444', bg: '#ef444415' },
};

function AssignModal({ request, onClose, onSuccess }) {
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        assetsAPI.getAll({ status: 'available' })
            .then(res => {
                const all = res.data.data.assets;
                // Only show assets matching the requested category
                const matching = all.filter(a => a.category?.toLowerCase() === request.assetCategory?.toLowerCase());
                setAvailableAssets(matching);
            })
            .catch(() => toast.error('Failed to load assets'))
            .finally(() => setLoading(false));
    }, [request.assetCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAsset) { toast.error('Please select an asset'); return; }
        setSubmitting(true);
        try {
            await assetRequestsAPI.assign(request._id, { assetId: selectedAsset, note });
            toast.success('Asset assigned successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Assignment failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 520, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3>Assign Asset</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                            Employee: <strong>{request.requestedBy?.name}</strong> · Requested: <strong>{request.assetCategory}</strong>
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {loading ? <div className="loading" style={{ minHeight: 80 }}><div className="spinner" /></div> : (
                        <form id="assignForm" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Select Asset *</label>
                                <select className="form-select" value={selectedAsset}
                                    onChange={e => setSelectedAsset(e.target.value)} required>
                                    <option value="" disabled>Choose an available asset…</option>
                                    {availableAssets.length === 0 && <option disabled>No available assets found</option>}
                                    {availableAssets.map(a => (
                                        <option key={a._id} value={a._id}>
                                            {a.category?.toLowerCase() === request.assetCategory?.toLowerCase() ? '★ ' : ''}
                                            {a.name} — {a.serialNumber} ({a.category})
                                        </option>
                                    ))}
                                </select>
                                {availableAssets.length === 0 && (
                                    <div className="alert alert-warning" style={{ marginTop: '0.5rem' }}>
                                        No available assets in inventory. Consider marking this request as "Purchase Needed".
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Note (optional)</label>
                                <textarea className="form-input" rows={2}
                                    placeholder="Any notes for the employee about this assignment…"
                                    value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
                            </div>
                        </form>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="assignForm" className="btn btn-primary"
                        disabled={submitting || loading || availableAssets.length === 0}>
                        {submitting ? 'Assigning…' : '✓ Assign Asset'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PurchaseModal({ request, onClose, onSuccess }) {
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await assetRequestsAPI.markPurchase(request._id, { note });
            toast.success('Marked as purchase needed');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 420, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3>Mark as Purchase Needed</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        This will flag the request as "Purchase Initiated". The employee will be notified that their asset is being procured.
                    </p>
                    <form id="purchaseForm" onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Note (optional)</label>
                            <textarea className="form-input" rows={3}
                                placeholder="e.g. Ordered 5 units, expected delivery next week…"
                                value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="purchaseForm" className="btn btn-warning" disabled={submitting}>
                        {submitting ? 'Saving…' : '🛒 Mark Purchase Needed'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StoreAssetRequests() {
    const [pending, setPending] = useState([]);
    const [purchaseList, setPurchaseList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [assignModal, setAssignModal] = useState(null);
    const [purchaseModal, setPurchaseModal] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendRes, purchRes] = await Promise.all([
                assetRequestsAPI.getAll({ status: 'pending_store' }),
                assetRequestsAPI.getAll({ status: 'purchase_requested' }),
            ]);
            setPending(pendRes.data.data.requests);
            setPurchaseList(purchRes.data.data.requests);
        } catch {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const displayList = tab === 'pending' ? pending : purchaseList;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Asset Requests</h1>
                    <p>Manager-approved requests waiting for your action</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {pending.length > 0 && (
                        <span className="badge badge-return_requested">
                            <span className="badge-dot" />{pending.length} Pending
                        </span>
                    )}
                    {purchaseList.length > 0 && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#a855f715', color: '#a855f7', border: '1px solid #a855f730' }}>
                            🛒 {purchaseList.length} Purchase
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem', width: 'fit-content' }}>
                {[
                    { id: 'pending', label: `Pending Assignment (${pending.length})` },
                    { id: 'purchase', label: `Purchase Requests (${purchaseList.length})` },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '0.45rem 1rem', borderRadius: 'calc(var(--radius) - 2px)',
                            border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                            background: tab === t.id ? 'var(--bg)' : 'transparent',
                            color: tab === t.id ? 'var(--accent)' : 'var(--text-muted)',
                            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}>{t.label}
                    </button>
                ))}
            </div>

            {displayList.length === 0 ? (
                <div className="premium-card">
                    <div className="empty-state">
                        <span className="empty-icon">{tab === 'pending' ? '🎉' : '🛒'}</span>
                        <h3>{tab === 'pending' ? 'No pending requests' : 'No purchase requests'}</h3>
                        <p>{tab === 'pending' ? 'All approved requests have been processed.' : 'No assets are pending procurement.'}</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {displayList.map(r => {
                        const um = URGENCY_META[r.urgency];
                        const initials = r.requestedBy?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                        return (
                            <div key={r._id} className="premium-card action-card" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                {/* Employee */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 160 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{initials}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.requestedBy?.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.requestedBy?.department || 'No dept'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{r.requestedBy?.email}</div>
                                    </div>
                                </div>

                                {/* Request details */}
                                <div className="action-card-info" style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                                        <div className="action-card-title" style={{ margin: 0 }}>{r.assetCategory}</div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: um?.bg, color: um?.color }}>{um?.label} Priority</span>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{r.assetDescription}"</div>
                                    {r.managerNote && (
                                        <div style={{ fontSize: '0.72rem', color: '#6366f1', marginTop: '0.3rem' }}>
                                            📝 Manager note: {r.managerNote}
                                        </div>
                                    )}
                                    {r.storeNote && (
                                        <div style={{ fontSize: '0.72rem', color: '#a855f7', marginTop: '0.25rem' }}>
                                            🛒 {r.storeNote}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Submitted {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {r.reviewedBy && <> · Approved by {r.reviewedBy?.name}</>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="action-card-btns">
                                    <button className="btn btn-success btn-sm" onClick={() => setAssignModal(r)}>
                                        ✓ Assign Asset
                                    </button>
                                    {tab === 'pending' && (
                                        <button className="btn btn-warning btn-sm" onClick={() => setPurchaseModal(r)}>
                                            🛒 Not in Stock
                                        </button>
                                    )}
                                    {tab === 'purchase' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => setAssignModal(r)}>
                                            ✓ Mark Assigned
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {assignModal && (
                <AssignModal request={assignModal} onClose={() => setAssignModal(null)} onSuccess={fetchData} />
            )}
            {purchaseModal && (
                <PurchaseModal request={purchaseModal} onClose={() => setPurchaseModal(null)} onSuccess={fetchData} />
            )}
        </div>
    );
}
