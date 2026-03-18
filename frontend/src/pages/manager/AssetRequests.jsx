import { useState, useEffect } from 'react';
import { assetRequestsAPI } from '../../api';
import toast from 'react-hot-toast';

const URGENCY_META = {
    low: { label: 'Low', color: '#10b981', bg: '#10b98115' },
    medium: { label: 'Medium', color: '#f59e0b', bg: '#f59e0b15' },
    high: { label: 'High', color: '#ef4444', bg: '#ef444415' },
};

const STATUS_META = {
    pending_manager: { label: 'Pending Approval', color: '#6366f1', icon: '⏳' },
    rejected: { label: 'Rejected', color: '#ef4444', icon: '✕' },
    pending_store: { label: 'Forwarded to Store', color: '#10b981', icon: '✓' },
    purchase_requested: { label: 'Purchase Initiated', color: '#a855f7', icon: '🛒' },
    assigned: { label: 'Assigned ✓', color: '#10b981', icon: '✅' },
};

function NoteModal({ title, placeholder, onConfirm, onClose }) {
    const [note, setNote] = useState('');
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Note (optional)</label>
                        <textarea className="form-input" rows={3} placeholder={placeholder}
                            value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={() => onConfirm(note)}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

export default function AssetRequests() {
    const [requests, setRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending'); // 'pending' | 'history'
    const [noteModal, setNoteModal] = useState(null); // { action: 'approve'|'reject', requestId }

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pendingRes, allRes] = await Promise.all([
                assetRequestsAPI.getAll({ status: 'pending_manager' }),
                assetRequestsAPI.getAll({ all: 'true' }),
            ]);
            setRequests(pendingRes.data.data.requests);
            setHistory(allRes.data.data.requests.filter(r => r.status !== 'pending_manager'));
        } catch {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAction = async (action, requestId, note) => {
        setNoteModal(null);
        try {
            if (action === 'approve') {
                await assetRequestsAPI.approve(requestId, { note });
                toast.success('Request approved — forwarded to Store Manager');
            } else {
                await assetRequestsAPI.reject(requestId, { note });
                toast.success('Request rejected');
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const displayList = tab === 'pending' ? requests : history;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Asset Requests</h1>
                    <p>Review and act on employee asset requests</p>
                </div>
                {requests.length > 0 && (
                    <span className="badge badge-return_requested">
                        <span className="badge-dot" />
                        {requests.length} Pending
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem', width: 'fit-content' }}>
                {[
                    { id: 'pending', label: `Pending Approval (${requests.length})` },
                    { id: 'history', label: `Reviewed (${history.length})` },
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
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-icon">{tab === 'pending' ? '🎉' : '📋'}</span>
                        <h3>{tab === 'pending' ? 'No pending requests' : 'No reviewed requests yet'}</h3>
                        <p>{tab === 'pending' ? 'All caught up! No asset requests awaiting your approval.' : 'Requests you approve or reject will appear here.'}</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {displayList.map(r => {
                        const um = URGENCY_META[r.urgency];
                        const sm = STATUS_META[r.status] || { label: r.status, color: '#6366f1', icon: '●' };
                        const initials = r.requestedBy?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                        return (
                            <div key={r._id} className="action-card" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                {/* Employee info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 160 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                        {initials}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.requestedBy?.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.requestedBy?.department || 'No dept'}</div>
                                    </div>
                                </div>

                                {/* Request info */}
                                <div className="action-card-info" style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                        <div className="action-card-title" style={{ margin: 0 }}>{r.assetCategory}</div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: um?.bg, color: um?.color }}>{um?.label}</span>
                                        {tab === 'history' && (
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${sm.color}15`, color: sm.color }}>{sm.icon} {sm.label}</span>
                                        )}
                                    </div>
                                    <div className="action-card-sub">
                                        <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{r.assetDescription}"</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Submitted {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    {r.managerNote && tab === 'history' && (
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Your note: <em>{r.managerNote}</em></div>
                                    )}
                                </div>

                                {/* Actions */}
                                {tab === 'pending' && (
                                    <div className="action-card-btns">
                                        <button className="btn btn-success btn-sm" onClick={() => setNoteModal({ action: 'approve', requestId: r._id })}>
                                            ✓ Approve
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => setNoteModal({ action: 'reject', requestId: r._id })}>
                                            ✕ Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {noteModal && (
                <NoteModal
                    title={noteModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                    placeholder={noteModal.action === 'approve'
                        ? 'Optional approval note for the store manager…'
                        : 'Reason for rejection (will be shown to employee)…'}
                    onConfirm={(note) => handleAction(noteModal.action, noteModal.requestId, note)}
                    onClose={() => setNoteModal(null)}
                />
            )}
        </div>
    );
}
