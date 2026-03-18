import { useState, useEffect } from 'react';
import { assignmentsAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'issued', 'return_requested', 'returned', 'transferred'];

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name, size = 28, fontSize = '0.62rem' }) {
    const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize, fontWeight: 800, flexShrink: 0,
        }}>{initials}</div>
    );
}

export default function AssignmentHistory() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await assignmentsAPI.getAll();
                setAssignments(res.data.data.assignments);
            } catch {
                toast.error('Failed to load assignment history');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = assignments.filter(a => {
        const matchStatus = filter === 'all' || a.status === filter;
        const q = search.toLowerCase();
        const matchSearch = !search ||
            a.asset?.name?.toLowerCase().includes(q) ||
            a.asset?.serialNumber?.toLowerCase().includes(q) ||
            a.employee?.name?.toLowerCase().includes(q) ||
            a.employee?.department?.toLowerCase().includes(q) ||
            a.assignedBy?.name?.toLowerCase().includes(q);
        return matchStatus && matchSearch;
    });

    const stats = {
        total: assignments.length,
        issued: assignments.filter(a => a.status === 'issued').length,
        returnRequested: assignments.filter(a => a.status === 'return_requested').length,
        returned: assignments.filter(a => a.status === 'returned').length,
        transferred: assignments.filter(a => a.status === 'transferred').length,
    };

    const statCards = [
        { label: 'Total Assignments', value: stats.total, color: '#818cf8', icon: '📋', key: 'all' },
        { label: 'Currently Issued', value: stats.issued, color: '#f59e0b', icon: '📤', key: 'issued' },
        { label: 'Pending Return', value: stats.returnRequested, color: '#ef4444', icon: '🔄', key: 'return_requested' },
        { label: 'Returned', value: stats.returned, color: '#10b981', icon: '✅', key: 'returned' },
        { label: 'Transferred', value: stats.transferred, color: '#8b5cf6', icon: '🔀', key: 'transferred' },
    ];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Assignment History</h1>
                    <p>Complete record of all asset assignments — past and present</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {statCards.map(s => {
                    const isActive = filter === s.key;
                    return (
                        <div
                            key={s.key}
                            className="glass-panel stat-card"
                            onClick={() => setFilter(isActive ? 'all' : s.key)}
                            style={{
                                cursor: 'pointer',
                                outline: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                                outlineOffset: 2,
                                transition: 'outline 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                                transform: isActive ? 'translateY(-2px)' : '',
                                boxShadow: isActive ? `0 6px 20px ${s.color}28` : '',
                                userSelect: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.25rem',
                                borderRadius: 'var(--radius)',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.transform = ''; }}
                        >
                            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{s.icon}</div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: isActive ? s.color : '', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                                <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>{s.label}</div>
                                {isActive && (
                                    <div style={{ fontSize: '0.65rem', color: s.color, fontWeight: 700, marginTop: '0.15rem', letterSpacing: '0.04em' }}>
                                        FILTERED ✕
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 'var(--radius)' }}>
                <div style={{ flex: '1 1 250px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Assignments</label>
                    <input
                        className="form-input"
                        placeholder="Asset name, serial no, employee or department…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ flex: '0 0 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                    <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        {STATUS_FILTERS.map(s => (
                            <option key={s} value={s}>
                                {s === 'all' ? 'All Assignments'
                                    : s === 'return_requested' ? 'Pending Return'
                                        : s === 'transferred' ? 'Transferred'
                                            : s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="premium-card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e8edf3' }}>
                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No assignments found</h3>
                        <p>Try changing your filters or search query.</p>
                    </div>
                ) : (
                    <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 0 }}>
                        <colgroup>
                            <col style={{ width: '18%' }} />{/* Asset */}
                            <col style={{ width: '18%' }} />{/* Employee */}
                            <col style={{ width: '12%' }} />{/* Department */}
                            <col style={{ width: '12%' }} />{/* Issued By */}
                            <col style={{ width: '10%' }} />{/* Issue Date */}
                            <col style={{ width: '10%' }} />{/* Return Date */}
                            <col style={{ width: '11%' }} />{/* Condition */}
                            <col style={{ width: '9%' }} /> {/* Status */}
                        </colgroup>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Asset', 'Employee', 'Department', 'Issued By', 'Issue Date', 'Return Date', 'Return Condition', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((a) => (
                                <tr
                                    key={a._id}
                                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    {/* Asset */}
                                    <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.asset?.name || '—'}</div>
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, display: 'inline-block', marginTop: 3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset?.serialNumber || ''}</span>
                                        {a.asset?.category && <div style={{ fontSize: '0.69rem', color: '#94a3b8', marginTop: 2 }}>{a.asset.category}</div>}
                                    </td>

                                    {/* Employee */}
                                    <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                        {a.employee ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.62rem', fontWeight: 800, flexShrink: 0 }}>
                                                    {a.employee.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.employee.name}</div>
                                                    <div style={{ fontSize: '0.69rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.employee.email}</div>
                                                </div>
                                            </div>
                                        ) : <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>—</span>}
                                    </td>

                                    {/* Department */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.employee?.department || '—'}</td>

                                    {/* Issued By */}
                                    <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                        {a.assignedBy ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 800, flexShrink: 0 }}>
                                                    {a.assignedBy.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                </div>
                                                <span style={{ fontSize: '0.81rem', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.assignedBy.name}</span>
                                            </div>
                                        ) : <span style={{ color: '#cbd5e1', fontSize: '0.82rem' }}>—</span>}
                                    </td>

                                    {/* Issue Date */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.81rem', color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(a.createdAt)}</td>

                                    {/* Return Date */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.81rem', whiteSpace: 'nowrap' }}>
                                        {a.status === 'returned' && a.updatedAt
                                            ? <span style={{ color: '#475569' }}>{formatDate(a.updatedAt)}</span>
                                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                                    </td>

                                    {/* Return Condition */}
                                    <td style={{ padding: '12px 12px' }}>
                                        {a.returnCondition
                                            ? <StatusBadge status={a.returnCondition} />
                                            : <span style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>—</span>}
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '12px 12px' }}>
                                        <StatusBadge status={a.status} />
                                        {a.notes && (
                                            <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.notes}>📝 {a.notes}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
