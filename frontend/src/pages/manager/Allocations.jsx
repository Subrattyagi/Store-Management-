import { useState, useEffect } from 'react';
import { assignmentsAPI, assetsAPI, usersAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

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

export default function Allocations() {
    const [assignments, setAssignments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ assetId: '', employeeId: '' });
    const [submitting, setSubmitting] = useState(false);
    const [historyTarget, setHistoryTarget] = useState(null); // { assetId, assetName, serialNumber }

    const fetchData = async () => {
        try {
            const [assignRes, assetsRes, empRes] = await Promise.all([
                assignmentsAPI.getAll(),
                assetsAPI.getAll({ status: 'available' }),
                usersAPI.getAll({ role: 'employee' })
            ]);
            setAssignments(assignRes.data.data.assignments);
            setAssets(assetsRes.data.data.assets);
            setEmployees(empRes.data.data.users);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAllocate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await assignmentsAPI.create(formData);
            toast.success('Asset issued successfully');
            setIsModalOpen(false);
            setFormData({ assetId: '', employeeId: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to allocate asset');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    // Filter out returned/lost assets and return requests from the allocations view
    const activeAssignments = assignments.filter(a =>
        a.status !== 'return_requested' &&
        !(a.status === 'returned' && a.asset?.status === 'lost')
    );

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Asset Allocations</h1>
                    <p>Manage all active assignments and issue new assets</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Issue Asset
                    </button>
                </div>
            </div>



            {/* ── All Assignments Table ── */}
            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Asset</th>
                            <th>Status</th>
                            <th>Assigned By</th>
                            <th>Date</th>
                            <th>History</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeAssignments.length === 0 ? (
                            <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon">📋</span><h3>No active allocations</h3><p>Issue an asset to an employee to get started.</p></div></td></tr>
                        ) : activeAssignments.map((a) => {
                            const initials = a.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                            return (
                                <tr key={a._id} style={{ borderLeft: '3px solid transparent' }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                                                {initials}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{a.employee?.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.employee?.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{a.asset?.name}</div>
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3, color: 'var(--text-secondary)' }}>
                                            {a.asset?.serialNumber}
                                        </span>
                                    </td>
                                    <td><StatusBadge status={a.status} /></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{a.assignedBy?.name}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                        {new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            title="View assignment history for this asset"
                                            onClick={() => setHistoryTarget({
                                                assetId: a.asset?._id,
                                                assetName: a.asset?.name,
                                                serialNumber: a.asset?.serialNumber,
                                            })}
                                        >
                                            🕐 History
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Issue Asset to Employee</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form id="allocateForm" onSubmit={handleAllocate}>
                                <div className="form-group">
                                    <label className="form-label">Select Employee</label>
                                    <select className="form-select" value={formData.employeeId}
                                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })} required>
                                        <option value="" disabled>Choose an employee…</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.name} — {emp.department || 'No Dept'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Select Available Asset</label>
                                    <select className="form-select" value={formData.assetId}
                                        onChange={e => setFormData({ ...formData, assetId: e.target.value })} required>
                                        <option value="" disabled>Choose an asset…</option>
                                        {assets.map(asset => (
                                            <option key={asset._id} value={asset._id}>{asset.name} — {asset.serialNumber}</option>
                                        ))}
                                    </select>
                                    {assets.length === 0 && (
                                        <div className="alert alert-warning" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                                            No available assets in inventory. Ask the store manager to add assets first.
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button type="submit" form="allocateForm" className="btn btn-primary" disabled={assets.length === 0 || submitting}>
                                {submitting ? 'Issuing…' : 'Issue Asset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Asset History Modal ── */}
            {historyTarget && (
                <AssetHistoryModal
                    assetId={historyTarget.assetId}
                    assetName={historyTarget.assetName}
                    serialNumber={historyTarget.serialNumber}
                    onClose={() => setHistoryTarget(null)}
                />
            )}
        </div>
    );
}
