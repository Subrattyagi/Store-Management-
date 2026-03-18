import { useState, useEffect } from 'react';
import { exitClearanceAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

export default function ExitApprovals() {
    const [clearances, setClearances] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchClearances = async () => {
        try {
            const [pendRes, blockedRes] = await Promise.all([
                exitClearanceAPI.getAll({ status: 'pending' }),
                exitClearanceAPI.getAll({ status: 'blocked' })
            ]);
            const all = [...pendRes.data.data.clearances, ...blockedRes.data.data.clearances]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setClearances(all);
        } catch {
            toast.error('Failed to load clearances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchClearances(); }, []);

    const handleApprove = async (clr) => {
        let remarks = '';
        if (clr.status === 'blocked') {
            remarks = window.prompt('⚠️ Clearance BLOCKED — override remark is mandatory:');
            if (!remarks) {
                toast.error('Override remark required');
                return;
            }
        } else {
            remarks = window.prompt('Optional approval remark:') || '';
        }
        try {
            await exitClearanceAPI.approve(clr._id, { remarks });
            toast.success('Exit clearance approved');
            fetchClearances();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        }
    };

    const handleReject = async (id) => {
        const remarks = window.prompt('Rejection remark (mandatory):');
        if (!remarks) { toast.error('Remark is required'); return; }
        try {
            await exitClearanceAPI.reject(id, { remarks });
            toast.success('Exit clearance rejected');
            fetchClearances();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rejection failed');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    const blocked = clearances.filter(c => c.status === 'blocked');
    const pending = clearances.filter(c => c.status === 'pending');

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Final Exit Approvals</h1>
                    <p>Review and finalize employee offboarding clearances</p>
                </div>
                {clearances.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {pending.length > 0 && <span className="badge badge-pending"><span className="badge-dot" />{pending.length} Pending</span>}
                        {blocked.length > 0 && <span className="badge badge-blocked"><span className="badge-dot" />{blocked.length} Blocked</span>}
                    </div>
                )}
            </div>

            {clearances.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-icon">✅</span>
                        <h3>No pending approvals</h3>
                        <p>All exit clearances are up to date.</p>
                    </div>
                </div>
            ) : (
                <div className="action-cards">
                    {clearances.map((clr) => (
                        <div key={clr._id} className="action-card" style={{ borderLeft: `3px solid ${clr.status === 'blocked' ? '#ef4444' : '#f59e0b'}` }}>
                            {/* Employee */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 180 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: clr.status === 'blocked' ? 'linear-gradient(135deg, #ef4444, #f87171)' : 'linear-gradient(135deg, #f59e0b, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                    {getInitials(clr.employee?.name)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{clr.employee?.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clr.employee?.department}</div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="action-card-info">
                                <div className="action-card-sub" style={{ flexDirection: 'column', gap: '0.2rem' }}>
                                    <span>Initiated by <strong>{clr.initiatedBy?.name}</strong></span>
                                    <span>{new Date(clr.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    {clr.remarks && <span style={{ color: clr.status === 'blocked' ? 'var(--danger)' : 'var(--text-muted)', fontStyle: 'italic' }}>{clr.remarks}</span>}
                                </div>
                            </div>

                            <StatusBadge status={clr.status} />

                            {/* Actions */}
                            <div className="action-card-btns">
                                <button
                                    className={`btn btn-sm ${clr.status === 'blocked' ? 'btn-warning' : 'btn-success'}`}
                                    onClick={() => handleApprove(clr)}
                                >
                                    {clr.status === 'blocked' ? '⚠ Force Approve' : '✓ Approve'}
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleReject(clr._id)}>
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
