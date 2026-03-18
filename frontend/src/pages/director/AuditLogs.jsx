import { useState, useEffect } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
    ASSET_CREATED: '#10b981',
    ASSET_ISSUED: '#6366f1',
    RETURN_REQUESTED: '#f59e0b',
    RETURN_APPROVED: '#10b981',
    ASSET_LOST: '#ef4444',
    STATUS_UPDATED: '#3b82f6',
    EXIT_INITIATED: '#f59e0b',
    EXIT_CLEARED: '#10b981',
    EXIT_BLOCKED: '#ef4444',
    ROLE_CHANGED: '#a855f7',
};

const getActionColor = (action) => ACTION_COLORS[action] || '#94a3b8';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const res = await reportsAPI.getAuditLogs({ page, limit: 15 });
            setLogs(res.data.data.logs);
            setPagination(res.data.data.pagination);
        } catch {
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(1); }, []);

    const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
            d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>System Audit Logs</h1>
                    <p>Immutable record of all state changes and actions</p>
                </div>
                <span className="badge badge-pending">
                    <span className="badge-dot" />
                    {pagination.total} entries
                </span>
            </div>

            <div className="card">
                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📄</span>
                        <h3>No audit logs yet</h3>
                        <p>Actions from your team will appear here.</p>
                    </div>
                ) : (
                    <div className="audit-timeline">
                        {logs.map((log) => (
                            <div key={log._id} className="audit-entry">
                                <div className="audit-avatar">{getInitials(log.performedBy?.name)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="audit-action">
                                        <span style={{ color: getActionColor(log.action), fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {log.action?.replace(/_/g, ' ')}
                                        </span>
                                        {' '}by{' '}
                                        <span style={{ fontWeight: 700 }}>{log.performedBy?.name || 'System'}</span>
                                        {log.asset && (
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {' '}— <span style={{ fontWeight: 600 }}>{log.asset.name}</span>{' '}
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3, color: 'var(--text-muted)' }}>
                                                    {log.asset.serialNumber}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="audit-meta">
                                        <span style={{ textTransform: 'capitalize', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 600 }}>{log.performedBy?.role?.replace('_', ' ')}</span>
                                        <span style={{ margin: '0 6px', color: 'var(--border)' }}>·</span>
                                        {formatTime(log.timestamp)}
                                        {(log.previousStatus || log.newStatus) && (
                                            <>
                                                <span style={{ margin: '0 6px', color: 'var(--border)' }}>·</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{log.previousStatus}</span>
                                                {log.previousStatus && log.newStatus && <span style={{ margin: '0 4px' }}>→</span>}
                                                <span style={{ fontWeight: 600, color: getActionColor(log.action) }}>{log.newStatus}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>
                        ← Previous
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong>
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}
