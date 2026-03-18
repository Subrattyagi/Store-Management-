import { useState, useEffect } from 'react';
import { issuesAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { label: 'Open', color: '#ef4444', icon: '🔴', bg: '#ef444415' },
    in_progress: { label: 'In Progress', color: '#f59e0b', icon: '⏳', bg: '#f59e0b15' },
    in_maintenance: { label: 'In Maintenance', color: '#8b5cf6', icon: '🔧', bg: '#8b5cf615' },
    resolved: { label: 'Resolved', color: '#10b981', icon: '✅', bg: '#10b98115' },
    rejected: { label: 'Rejected', color: '#64748b', icon: '❌', bg: '#f1f5f9' },
};

function IssueDetailsModal({ issue, onClose, onStatusChange }) {
    if (!issue) return null;
    const sm = STATUS_META[issue.status] || STATUS_META.open;

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 700, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                {/* Header built into the top */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-secondary)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{issue.issueType}</h3>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: sm.bg, color: sm.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {sm.label}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Reported on {new Date(issue.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>×</button>
                </div>

                {/* Two Column Layout inside Modal Body */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', padding: '1.5rem' }}>

                    {/* Left Col: Context Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Associated Asset</div>
                            <div style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>{issue.asset?.name || 'Unknown Asset'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{issue.asset?.category || '—'}</div>
                                {issue.asset?.serialNumber && (
                                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', padding: '4px 8px', background: 'var(--bg)', borderRadius: '4px', display: 'inline-block', border: '1px solid var(--border)' }}>
                                        SN: {issue.asset.serialNumber}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Reported By</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    {issue.reportedBy?.name?.split(' ').map(n => n[0]).join('') || '?'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{issue.reportedBy?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{issue.reportedBy?.department || 'Employee'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Issue Itself */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Issue Description</div>
                            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                                {issue.description}
                            </div>
                        </div>

                        {issue.attachmentUrl && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Provided Attachment</div>
                                <a href={issue.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.875rem 1rem', background: '#eff6ff', borderRadius: 'var(--radius-sm)', color: '#3b82f6', textDecoration: 'none', fontWeight: 600, border: '1px solid #bfdbfe', transition: 'all 0.2s', ':hover': { borderColor: '#93c5fd', background: '#dbeafe' } }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    View Attached File / Link
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-secondary)' }}>
                    {issue.status !== 'rejected' && issue.status !== 'resolved' && (
                        <button className="btn btn-ghost" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => { onStatusChange(issue._id, 'rejected'); onClose(); }}>
                            Reject Issue
                        </button>
                    )}
                    {issue.status !== 'in_maintenance' && issue.status !== 'resolved' && issue.status !== 'rejected' && (
                        <button className="btn" style={{ background: '#f59e0b', color: 'white', borderColor: '#d97706' }} onClick={() => { onStatusChange(issue._id, 'in_maintenance'); onClose(); }}>
                            Approve for Maintenance
                        </button>
                    )}
                    {issue.status !== 'resolved' && (
                        <button className="btn btn-primary" onClick={() => { onStatusChange(issue._id, 'resolved'); onClose(); }}>
                            Mark as Resolved
                        </button>
                    )}
                    {(issue.status === 'resolved' || issue.status === 'rejected') && (
                        <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Issues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, open, in_maintenance, resolved, rejected
    const [selectedIssue, setSelectedIssue] = useState(null);

    const fetchIssues = async () => {
        try {
            const res = await issuesAPI.getAll();
            setIssues(res.data.data.issues);
        } catch {
            toast.error('Failed to load issues');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIssues(); }, []);

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await issuesAPI.updateStatus(id, { status: newStatus });
            toast.success(`Issue marked as ${STATUS_META[newStatus].label}`);
            setIssues(issues.map(i => i._id === id ? { ...i, status: res.data.data.issue.status } : i));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const filteredIssues = filter === 'all' ? issues : issues.filter(i => i.status === filter);

    const metrics = {
        total: issues.length,
        open: issues.filter(i => i.status === 'open').length,
        inMaintenance: issues.filter(i => i.status === 'in_maintenance').length,
    };

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div className="page-header-left">
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Issue Management
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Centralized dashboard to track, approve, and resolve asset issues.</p>
                </div>
            </div>

            {/* Premium Metrics Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #3b82f6' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📋</div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reported</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.total}</div>
                    </div>
                </div>
                <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #ef4444' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🔴</div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Required</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.open}</div>
                    </div>
                </div>
                <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #8b5cf6' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🔧</div>
                    <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Maintenance</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>{metrics.inMaintenance}</div>
                    </div>
                </div>
            </div>

            {/* View Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { id: 'all', label: 'All Issues' },
                    { id: 'open', label: 'Open' },
                    { id: 'in_maintenance', label: 'In Maintenance' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'rejected', label: 'Rejected' },
                ].map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                        style={{
                            padding: '0.5rem 1.25rem', borderRadius: '999px', border: '1px solid',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            background: filter === f.id ? 'var(--text)' : 'transparent',
                            color: filter === f.id ? 'var(--bg)' : 'var(--text-secondary)',
                            borderColor: filter === f.id ? 'var(--text)' : 'var(--border)'
                        }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Rich Data Table */}
            <div className="premium-card" style={{ overflow: 'hidden' }}>
                <div className="table-wrapper">
                    <table className="table" style={{ width: '100%' }}>
                        <thead style={{ background: 'var(--bg-secondary)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue & Asset</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reported By</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIssues.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✨</div>
                                            <div>
                                                <h3 style={{ margin: '0 0 0.5rem 0' }}>No {filter !== 'all' ? filter.replace('_', ' ') : ''} issues found</h3>
                                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You're all caught up!</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredIssues.map(issue => {
                                    const sm = STATUS_META[issue.status] || STATUS_META.open;
                                    return (
                                        <tr key={issue._id} style={{ transition: 'background 0.2s', ':hover': { background: 'var(--bg-secondary)' } }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: sm.bg, color: sm.color }}>
                                                    {sm.icon} {sm.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--text)', marginBottom: '0.2rem' }}>{issue.issueType}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />
                                                    {issue.asset?.name || 'Unknown Asset'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{issue.reportedBy?.name || 'Unknown'}</div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text)', fontWeight: 600, borderColor: 'var(--border)' }}
                                                    onClick={() => setSelectedIssue(issue)}
                                                >
                                                    Review Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedIssue && (
                <IssueDetailsModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}
