import { useState, useEffect, useCallback, useRef } from 'react';
import { issuesAPI } from '../../api';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
    const map = {
        open: { label: 'Open', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        in_progress: { label: 'In Progress', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
        in_maintenance: { label: 'Maintenance', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
        resolved: { label: 'Resolved', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
        rejected: { label: 'Rejected', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
    };
    const s = map[status] || map.open;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
            color: s.color, background: s.bg, border: `1px solid ${s.border}`, letterSpacing: '0.01em'
        }}>
            {s.label}
        </span>
    );
}

/* ── Row Action Menu (kebab ⋮ dropdown) ── */
function RowActionMenu({ issue, onView, isOpen, onToggle, onClose }) {
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const btnRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (!btnRef.current?.contains(e.target) && !e.target.closest('[data-row-menu-popup]')) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    const toggle = (e) => {
        e.stopPropagation();
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuH = 100;
            const top = spaceBelow > menuH ? rect.bottom + 6 : rect.top - menuH - 6;
            const right = window.innerWidth - rect.right;
            setMenuPos({ top, right });
        }
        onToggle();
    };

    const act = (fn) => { onClose(); fn(); };

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
                ref={btnRef}
                onClick={toggle}
                style={{
                    width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#f1f5f9' : 'transparent', border: `1.5px solid ${isOpen ? '#cbd5e1' : 'transparent'}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s ease', color: isOpen ? '#334155' : '#94a3b8', padding: 0
                }}
                onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; } }}
                onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>

            {isOpen && (
                <div data-row-menu-popup style={{
                    position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999, width: 160,
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 32px rgba(15,23,42,0.12)', padding: '6px',
                    animation: 'menuSlideIn 0.14s cubic-bezier(0.16,1,0.3,1)',
                }}>
                    <button onClick={() => act(onView)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#334155', fontSize: '0.82rem', fontWeight: 500, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 7, color: '#64748b' }}>
                            📋
                        </span>
                        View Details
                    </button>
                </div>
            )}
        </div>
    );
}

function IssueDetailsModal({ issue, onClose, onStatusChange }) {
    if (!issue) return null;

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 720, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                {/* ── Header ── */}
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.2rem' }}>{issue.issueType}</h3>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Reported {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <StatusBadge status={issue.status} />
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>

                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Issue Description */}
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Issue Description</div>
                            <div style={{ fontSize: '0.84rem', color: '#1e293b', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {issue.description}
                            </div>
                        </div>

                        {/* Resolution Date Info */}
                        {issue.status === 'resolved' && (
                            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', marginBottom: '0.2rem' }}>
                                    ✓ Resolved On
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>
                                    {new Date(issue.resolvedAt || issue.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        )}

                        {/* Evidence */}
                        {issue.attachmentUrl && (
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attached Evidence</div>
                                {issue.attachmentUrl.startsWith('data:image') ? (
                                    <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                        <img src={issue.attachmentUrl} alt="Attached Evidence" style={{ width: '100%', display: 'block' }} />
                                    </div>
                                ) : (
                                    <a href={issue.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-sm)', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
                                        📄 View Attachment
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Reported By */}
                        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', marginBottom: '0.75rem' }}>
                                👤 Reported By
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                                    {issue.reportedBy?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{issue.reportedBy?.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{issue.reportedBy?.department || 'Employee'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Associated Asset */}
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Associated Asset</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Name</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{issue.asset?.name || '—'}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Category</div>
                                        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{issue.asset?.category || '—'}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Serial</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#e2e8f0', display: 'inline-block', padding: '1px 6px', borderRadius: 4 }}>{issue.asset?.serialNumber || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="modal-footer" style={{ borderTop: '1px solid var(--border)' }}>
                    {issue.status !== 'rejected' && issue.status !== 'resolved' && (
                        <button className="btn btn-ghost" style={{ color: '#dc2626' }} onClick={() => { onStatusChange(issue._id, 'rejected'); onClose(); }}>
                            Reject
                        </button>
                    )}
                    {issue.status !== 'in_maintenance' && issue.status !== 'resolved' && issue.status !== 'rejected' && (
                        <button className="btn btn-warning btn-sm" onClick={() => { onStatusChange(issue._id, 'in_maintenance'); onClose(); }}>
                            🔧 Send to Maintenance
                        </button>
                    )}
                    {issue.status !== 'resolved' && (
                        <button className="btn btn-success btn-sm" onClick={() => { onStatusChange(issue._id, 'resolved'); onClose(); }}>
                            ✓ Mark as Resolved
                        </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default function Issues() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);

    const fetchIssues = async () => {
        setLoading(true);
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
            toast.success(`Issue marked as ${newStatus.replace('_', ' ')}`);
            setIssues(prev => prev.map(i => i._id === id ? { ...i, status: res.data.data.issue.status, resolvedAt: res.data.data.issue.resolvedAt } : i));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    // Derived statistics
    const stats = {
        total: issues.length,
        open: issues.filter(i => i.status === 'open' || i.status === 'in_progress').length,
        maintenance: issues.filter(i => i.status === 'in_maintenance').length,
        resolved: issues.filter(i => i.status === 'resolved').length,
    };

    // Filter Logic
    const filteredIssues = issues.filter(i => {
        const matchStatus = filter === 'all'
            ? true
            : filter === 'action_required'
                ? (i.status === 'open' || i.status === 'in_progress')
                : i.status === filter;

        const q = search.toLowerCase();
        const matchSearch = !search ||
            i.issueType.toLowerCase().includes(q) ||
            i.asset?.name?.toLowerCase().includes(q) ||
            i.asset?.serialNumber?.toLowerCase().includes(q) ||
            i.reportedBy?.name?.toLowerCase().includes(q);

        return matchStatus && matchSearch;
    });

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Issue Management</h1>
                    <p>Track, approve, and resolve reported asset issues quickly.</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
                {[
                    { label: 'Total Reported', value: stats.total, icon: '📋', color: '#6366f1', filterKey: 'all' },
                    { label: 'Action Required', value: stats.open, icon: '⚠️', color: '#ef4444', filterKey: 'action_required' },
                    { label: 'In Maintenance', value: stats.maintenance, icon: '🔧', color: '#f59e0b', filterKey: 'in_maintenance' },
                    { label: 'Resolved', value: stats.resolved, icon: '✅', color: '#10b981', filterKey: 'resolved' },
                ].map(s => {
                    const isActive = filter === s.filterKey;
                    return (
                        <div
                            key={s.label}
                            className="glass-panel stat-card"
                            onClick={() => setFilter(isActive ? 'all' : s.filterKey)}
                            style={{ cursor: 'pointer', outline: isActive ? `2px solid ${s.color}` : '2px solid transparent', outlineOffset: 2, transition: 'all 0.15s ease', transform: isActive ? 'translateY(-2px)' : '', boxShadow: isActive ? `0 6px 20px ${s.color}28` : '', userSelect: 'none' }}
                        >
                            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: isActive ? s.color : '' }}>{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                                {isActive && <div style={{ fontSize: '0.65rem', color: s.color, fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.04em' }}>FILTERED ✕</div>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters Banner */}
            <div className="glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 'var(--radius)' }}>
                <div style={{ flex: '1 1 250px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Issues</label>
                    <input className="form-input" placeholder="Issue type, asset name, or reporter..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ flex: '0 0 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Status</label>
                    <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">All Issues</option>
                        <option value="action_required">Action Required</option>
                        <option value="in_maintenance">In Maintenance</option>
                        <option value="resolved">Resolved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {filteredIssues.length} result{filteredIssues.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="premium-card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e8edf3', padding: 0 }}>
                {loading ? (
                    <div className="loading" style={{ minHeight: 300 }}><div className="spinner" /></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', minWidth: 800 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Issue & Asset</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Reported By</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Dates</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Status</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3', background: '#f8fafc', position: 'sticky', right: 0, boxShadow: '-2px 0 6px rgba(0,0,0,0.04)' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIssues.length === 0 ? (
                                    <tr><td colSpan="5">
                                        <div className="empty-state">
                                            <div className="empty-icon">✨</div>
                                            <h3>No issues found</h3>
                                            <p>Everything is looking good!</p>
                                        </div>
                                    </td></tr>
                                ) : filteredIssues.map(issue => (
                                    <tr
                                        key={issue._id}
                                        style={{ cursor: 'pointer', transition: 'background 0.12s', borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                        onClick={() => setSelectedIssue(issue)}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.15rem' }}>{issue.issueType}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {issue.asset?.name || 'Unknown Asset'}
                                                {issue.asset?.serialNumber && <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '1px 4px', borderRadius: 4, color: '#475569' }}>{issue.asset.serialNumber}</span>}
                                            </div>
                                        </td>

                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>
                                                    {issue.reportedBy?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>{issue.reportedBy?.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{issue.reportedBy?.department}</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.15rem' }}>
                                                <span style={{ color: '#94a3b8', marginRight: '4px' }}>Rep:</span>
                                                {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            {issue.status === 'resolved' && (
                                                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                                    <span style={{ color: '#34d399', marginRight: '4px' }}>Res:</span>
                                                    {new Date(issue.resolvedAt || issue.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            )}
                                        </td>

                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusBadge status={issue.status} />
                                        </td>

                                        <td onClick={e => e.stopPropagation()} style={{ padding: '8px 12px', textAlign: 'center', position: 'sticky', right: 0, background: 'inherit', boxShadow: '-2px 0 6px rgba(0,0,0,0.04)', zIndex: 1 }}>
                                            <RowActionMenu
                                                issue={issue}
                                                isOpen={openMenuId === issue._id}
                                                onToggle={() => setOpenMenuId(prev => prev === issue._id ? null : issue._id)}
                                                onClose={() => setOpenMenuId(null)}
                                                onView={() => setSelectedIssue(issue)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
