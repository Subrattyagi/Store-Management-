import { useState, useEffect } from 'react';
import { issuesAPI, assignmentsAPI } from '../../api';
import toast from 'react-hot-toast';

const STATUS_META = {
    open: { label: 'Open', color: '#ef4444', icon: '🔴', bg: '#ef444415' },
    in_progress: { label: 'In Progress', color: '#f59e0b', icon: '⏳', bg: '#f59e0b15' },
    in_maintenance: { label: 'In Maintenance', color: '#8b5cf6', icon: '🔧', bg: '#8b5cf615' },
    resolved: { label: 'Resolved', color: '#10b981', icon: '✅', bg: '#10b98115' },
    rejected: { label: 'Rejected', color: '#64748b', icon: '❌', bg: '#f1f5f9' },
};

function ReportIssueModal({ onClose, onSuccess, assignments }) {
    const [form, setForm] = useState({ asset: '', issueType: '', description: '', attachmentUrl: '' });
    const [submitting, setSubmitting] = useState(false);

    const handle = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await issuesAPI.reportIssue(form);
            toast.success('Issue reported successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to report issue');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal premium-card" style={{ maxWidth: 500, border: 'none', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', background: 'rgba(255, 255, 255, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Report a New Issue</h3>
                    <button className="modal-close" onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>×</button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <form id="issueForm" onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Select Asset *</label>
                            {assignments.length === 0 ? (
                                <div style={{ fontSize: '0.85rem', color: '#ef4444', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                                    You have no actively assigned assets to report an issue for.
                                </div>
                            ) : (
                                <select className="form-select" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} required>
                                    <option value="" disabled>Choose an asset from your assignments…</option>
                                    {assignments.map(a => (
                                        <option key={a.asset._id} value={a.asset._id}>
                                            {a.asset.name} ({a.asset.serialNumber}) - {a.asset.category}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Issue Type *</label>
                            <select className="form-select" value={form.issueType} onChange={e => setForm({ ...form, issueType: e.target.value })} required disabled={!form.asset}>
                                <option value="" disabled>Select the nature of the problem…</option>
                                {['Screen problem', 'Battery problem', 'Keyboard issue', 'Software issue', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Detailed Description *</label>
                            <textarea className="form-input" rows={4}
                                placeholder="Describe the problem in detail. When does it happen? What have you tried?"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                required disabled={!form.asset} style={{ resize: 'vertical' }} />
                        </div>

                        <div>
                            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Attachment Link (Optional)</label>
                            <input type="url" className="form-input"
                                placeholder="https://drive.google.com/..."
                                value={form.attachmentUrl}
                                onChange={e => setForm({ ...form, attachmentUrl: e.target.value })} disabled={!form.asset} />
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>Provide a link to a screenshot or screen recording if applicable.</div>
                        </div>
                    </form>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(226, 232, 240, 0.6)', background: 'rgba(255, 255, 255, 0.5)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="issueForm" className="btn btn-primary" disabled={submitting || form.asset === ''}>
                        {submitting ? 'Submitting…' : 'Submit Issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EmployeeIssues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [assignments, setAssignments] = useState([]);

    const fetchData = async () => {
        try {
            const [issueRes, assignRes] = await Promise.all([
                issuesAPI.getMyIssues(),
                assignmentsAPI.getAll()
            ]);
            setIssues(issueRes.data.data.issues);
            setAssignments(assignRes.data.data.assignments.filter(a => a.status === 'issued'));
        } catch {
            toast.error('Failed to load issues and assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const filteredIssues = filter === 'all' ? issues : issues.filter(i => i.status === filter);

    return (
        <div>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div className="page-header-left">
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        My Issues
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Track and manage service requests for your assigned assets.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '0.3rem' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                    Report New Issue
                </button>
            </div>

            {/* View Filters */}
            <div className="glass-panel" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderRadius: '999px', padding: '0.4rem', width: 'fit-content' }}>
                {[
                    { id: 'all', label: `All Issues (${issues.length})` },
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'in_maintenance', label: 'In Maintenance' },
                    { id: 'resolved', label: 'Resolved' },
                ].map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: '999px',
                            border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            background: filter === f.id ? 'var(--bg)' : 'transparent',
                            color: filter === f.id ? 'var(--text)' : 'var(--text-secondary)',
                            boxShadow: filter === f.id ? '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Issues Grid View */}
            {filteredIssues.length === 0 ? (
                <div className="premium-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--border-strong)', background: 'transparent', boxShadow: 'none' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem', border: '1px solid var(--border)' }}>🎉</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>No issues found</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 400, marginInline: 'auto' }}>
                        {filter === 'all'
                            ? "You haven't reported any hardware or software issues for your assets. Everything is running smoothly!"
                            : `There are currently no issues in the "${filter.replace('_', ' ')}" state.`}
                    </p>
                    {filter === 'all' && (
                        <button className="btn btn-ghost" style={{ marginTop: '1.5rem', fontWeight: 600, border: '1px solid var(--border)' }} onClick={() => setShowModal(true)}>
                            Report an issue now
                        </button>
                    )}
                </div>
            ) : (
                <div className="asset-cards-grid" style={{ gap: '1.5rem' }}>
                    {filteredIssues.map(issue => {
                        const sm = STATUS_META[issue.status] || STATUS_META.open;
                        return (
                            <div key={issue._id} className="premium-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                                {/* Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                                            {issue.asset?.category?.toLowerCase().includes('laptop') ? '💻' : issue.asset?.category?.toLowerCase().includes('phone') ? '📱' : '⚙️'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)', lineHeight: 1.2 }}>{issue.issueType}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>{issue.asset?.name || 'Unknown Asset'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Pill */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: sm.bg, color: sm.color, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        {sm.icon} {sm.label}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {issue.description}
                                </div>

                                {/* Card Footer */}
                                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Reported On</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.15rem' }}>{new Date(issue.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </div>
                                    {issue.attachmentUrl && (
                                        <a href={issue.attachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                            View
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <ReportIssueModal assignments={assignments} onClose={() => setShowModal(false)} onSuccess={fetchData} />
            )}
        </div>
    );
}
