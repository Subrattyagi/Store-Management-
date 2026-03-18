import { useState, useEffect } from 'react';
import { exitClearanceAPI, usersAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

export default function ExitClearance() {
    const [clearances, setClearances] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ employeeId: '', remarks: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const [clrRes, empRes] = await Promise.all([
                exitClearanceAPI.getAll(),
                usersAPI.getAll({ role: 'employee' })
            ]);
            setClearances(clrRes.data.data.clearances);
            setEmployees(empRes.data.data.users.filter(u => u.status !== 'exiting' && u.status !== 'cleared'));
        } catch {
            toast.error('Failed to load exit clearances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleInitiate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await exitClearanceAPI.initiate(formData);
            toast.success('Exit clearance initiated');
            setIsModalOpen(false);
            setFormData({ employeeId: '', remarks: '' });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to initiate clearance');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Exit Clearances</h1>
                    <p>Monitor exiting employees and manage the offboarding process</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Initiate Exit
                </button>
            </div>

            {clearances.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-icon">✅</span>
                        <h3>No active exit clearances</h3>
                        <p>When an employee leaves, initiate their clearance process here.</p>
                    </div>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Status</th>
                                <th>Initiated By</th>
                                <th>Approved By</th>
                                <th>Remarks</th>
                                <th>Start Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clearances.map((clr) => (
                                <tr key={clr._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                                                {getInitials(clr.employee?.name)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{clr.employee?.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clr.employee?.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><StatusBadge status={clr.status} /></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{clr.initiatedBy?.name}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{clr.approvedBy?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                                    <td style={{ maxWidth: 200 }}>
                                        {clr.remarks ? (
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {clr.remarks.substring(0, 50)}{clr.remarks.length > 50 ? '…' : ''}
                                            </span>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                        {new Date(clr.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Initiate Offboarding</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            {employees.length === 0 && (
                                <div className="alert alert-warning">All current employees have already had exit clearance initiated.</div>
                            )}
                            <form id="initiateForm" onSubmit={handleInitiate}>
                                <div className="form-group">
                                    <label className="form-label">Select Employee</label>
                                    <select
                                        className="form-select"
                                        value={formData.employeeId}
                                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Choose an employee…</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.name} — {emp.department || 'No Dept'}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Remarks (Optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Provide context for the exit…"
                                        value={formData.remarks}
                                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button type="submit" form="initiateForm" className="btn btn-danger" disabled={employees.length === 0 || submitting}>
                                {submitting ? 'Initiating…' : 'Begin Clearance'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
