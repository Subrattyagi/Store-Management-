import { useState, useEffect } from 'react';
import { assignmentsAPI, assetsAPI } from '../../api';
import toast from 'react-hot-toast';

const CONDITION_OPTIONS = [
    { value: 'new', label: '🟢 New — same as issued', color: '#10b981' },
    { value: 'good', label: '🔵 Good — normal wear', color: '#3b82f6' },
    { value: 'minor_damage', label: '🟡 Minor Damage — minor scratches/issues', color: '#f59e0b' },
    { value: 'major_damage', label: '🟠 Major Damage — significant damage', color: '#f97316' },
    { value: 'retired', label: '⛔ Retired — no longer usable', color: '#ef4444' },
];

function ReturnActions({ id, onDone }) {
    const [condition, setCondition] = useState('good');
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        const notes = window.prompt(`Approving return — condition: "${condition}". Add notes (optional):`);
        if (notes === null) return;
        setLoading(true);
        try {
            await assignmentsAPI.approveReturn(id, { returnCondition: condition, notes });
            toast.success(`Return accepted — asset recorded as: ${condition.replace(/_/g, ' ')}`);
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve return');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            <select
                value={condition}
                onChange={e => setCondition(e.target.value)}
                style={{
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.625rem',
                    fontSize: '0.78rem',
                    fontFamily: 'Outfit, sans-serif',
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    cursor: 'pointer',
                    maxWidth: 200,
                }}
            >
                {CONDITION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <button
                className="btn btn-success btn-sm"
                onClick={handleApprove}
                disabled={loading}
                style={{ whiteSpace: 'nowrap' }}
            >
                {loading ? '…' : '✓ Approve Return'}
            </button>
        </div>
    );
}

export default function Returns() {
    const [returnRequests, setReturnRequests] = useState([]);
    const [lostAssets, setLostAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('returns'); // 'returns' | 'lost'

    const fetchData = async () => {
        setLoading(true);
        // Fetch independently so one failure doesn't blank the whole page
        try {
            const returnRes = await assignmentsAPI.getAll({ status: 'return_requested' });
            setReturnRequests(returnRes.data.data.assignments || []);
        } catch (err) {
            console.error('Returns fetch error:', err?.response?.data || err.message);
            toast.error('Failed to load return requests');
        }
        try {
            const lostRes = await assetsAPI.getAll({ status: 'lost' });
            setLostAssets(lostRes.data.data.assets || []);
        } catch (err) {
            console.error('Lost assets fetch error:', err?.response?.data || err.message);
        }
        setLoading(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Returns & Lost Assets</h1>
                    <p>Inspect returned assets and track lost asset reports</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {returnRequests.length > 0 && (
                        <span className="badge badge-return_requested">
                            <span className="badge-dot" />{returnRequests.length} Return{returnRequests.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {lostAssets.length > 0 && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}>
                            ⚠ {lostAssets.length} Lost
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem', width: 'fit-content' }}>
                {[
                    { id: 'returns', label: `Pending Returns (${returnRequests.length})` },
                    { id: 'lost', label: `Lost Asset Reports (${lostAssets.length})` },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '0.45rem 1rem', borderRadius: 'calc(var(--radius) - 2px)',
                            border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                            background: tab === t.id ? 'var(--bg)' : 'transparent',
                            color: tab === t.id ? (t.id === 'lost' ? '#ef4444' : 'var(--accent)') : 'var(--text-muted)',
                            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}>{t.label}
                    </button>
                ))}
            </div>

            {/* ── Return Requests Tab ── */}
            {tab === 'returns' && (
                returnRequests.length === 0 ? (
                    <div className="premium-card">
                        <div className="empty-state">
                            <span className="empty-icon">✅</span>
                            <h3>All clear!</h3>
                            <p>No pending asset returns to verify right now.</p>
                        </div>
                    </div>
                ) : (
                    <div className="action-cards">
                        {returnRequests.map((req) => {
                            const initials = req.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                            return (
                                <div key={req._id} className="premium-card action-card">
                                    {/* Employee */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 180 }}>
                                        <div className="user-list-avatar" style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>{req.employee?.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.employee?.department || 'No department'}</div>
                                        </div>
                                    </div>

                                    {/* Asset info */}
                                    <div className="action-card-info">
                                        <div className="action-card-title">{req.asset?.name}</div>
                                        <div className="action-card-sub">
                                            <span>{req.asset?.category}</span>
                                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>
                                                {req.asset?.serialNumber}
                                            </span>
                                            <span>Requested {new Date(req.updatedAt || req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <ReturnActions id={req._id} onDone={fetchData} />
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ── Lost Assets Tab ── */}
            {tab === 'lost' && (
                lostAssets.length === 0 ? (
                    <div className="premium-card">
                        <div className="empty-state">
                            <span className="empty-icon">🎉</span>
                            <h3>No lost assets</h3>
                            <p>No assets have been reported as lost.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {lostAssets.map(asset => (
                            <div key={asset._id} className="premium-card" style={{ padding: '1rem 1.25rem', border: '1.5px solid #ef444430', background: '#ef444408' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: '#ef444415', border: '1.5px solid #ef444440', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                                            ❌
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{asset.name}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 3, color: 'var(--text-secondary)' }}>{asset.serialNumber}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.category}</span>
                                                {asset.company && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {asset.company}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: '#ef444420', color: '#ef4444', letterSpacing: '0.05em' }}>
                                            LOST
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                            Reported {new Date(asset.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#ef444410', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#ef4444' }}>
                                    ⚠ This asset has been marked as lost. You may need to initiate a replacement purchase request or file an official report.
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
