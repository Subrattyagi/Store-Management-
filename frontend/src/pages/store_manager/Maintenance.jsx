import { useState, useEffect, useCallback } from 'react';
import { maintenanceAPI, assetsAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed'];

function fmt(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtCost(cost) {
    if (cost == null) return '—';
    return `₹${Number(cost).toLocaleString('en-IN')}`;
}

/* ── Log Maintenance Modal ── */
function LogMaintenanceModal({ onClose, onSave }) {
    const [assets, setAssets] = useState([]);
    const [form, setForm] = useState({
        asset: '', description: '', repairVendor: '', repairCost: '', repairDate: '', notes: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        assetsAPI.getAll().then(res => {
            // Show assets that are available, under_maintenance, or have damage conditions
            const all = res.data.data.assets;
            const eligible = all.filter(a =>
                !a.isDeleted &&
                a.status !== 'issued' && a.status !== 'lost' &&
                (a.status === 'under_maintenance' ||
                    ['minor_damage', 'major_damage'].includes(a.condition) ||
                    a.status === 'available')
            );
            setAssets(eligible);
        }).catch(() => toast.error('Failed to load assets'));
    }, []);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.asset) { toast.error('Please select an asset'); return; }
        if (!form.description.trim()) { toast.error('Issue description is required'); return; }
        setSaving(true);
        try {
            const payload = {
                asset: form.asset,
                description: form.description.trim(),
                repairVendor: form.repairVendor.trim() || undefined,
                repairCost: form.repairCost ? Number(form.repairCost) : undefined,
                repairDate: form.repairDate || undefined,
                notes: form.notes.trim() || undefined,
            };
            const res = await maintenanceAPI.create(payload);
            toast.success('Maintenance record created');
            onSave(res.data.data.maintenance);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create record');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 560, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>🔧 Log Maintenance</h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Create a new maintenance record for a damaged asset</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Asset selector */}
                        <div>
                            <label className="form-label">Asset <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select className="form-select" value={form.asset} onChange={e => set('asset', e.target.value)} required>
                                <option value="">— Select asset —</option>
                                {assets.map(a => (
                                    <option key={a._id} value={a._id}>
                                        {a.name} · {a.serialNumber} [{a.condition?.replace(/_/g, ' ')}]
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="form-label">Issue Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="Describe the damage or issue…"
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                                required
                            />
                        </div>

                        {/* Vendor + Cost */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label className="form-label">Repair Vendor</label>
                                <input className="form-input" placeholder="e.g. TechFix Services" value={form.repairVendor} onChange={e => set('repairVendor', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Repair Cost (₹)</label>
                                <input className="form-input" type="number" min="0" placeholder="e.g. 2500" value={form.repairCost} onChange={e => set('repairCost', e.target.value)} />
                            </div>
                        </div>

                        {/* Repair Date */}
                        <div>
                            <label className="form-label">Expected Repair Date</label>
                            <input className="form-input" type="date" value={form.repairDate} onChange={e => set('repairDate', e.target.value)} />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <textarea
                                className="form-input"
                                rows={2}
                                placeholder="Any additional notes…"
                                value={form.notes}
                                onChange={e => set('notes', e.target.value)}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#92400e' }}>
                            ⚠️ The asset will be automatically moved to <strong>Under Maintenance</strong> status upon submission.
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? 'Saving…' : '🔧 Log Maintenance'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Update Status Modal ── */
function UpdateStatusModal({ record, onClose, onSave }) {
    const [status, setStatus] = useState(record.maintenanceStatus);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === record.maintenanceStatus) { toast.error('Please select a different status'); return; }
        setSaving(true);
        try {
            const res = await maintenanceAPI.updateStatus(record._id, {
                maintenanceStatus: status,
                notes: notes.trim() || undefined,
            });
            const msg = status === 'completed'
                ? 'Maintenance marked as completed — asset is now Available'
                : 'Maintenance status updated';
            toast.success(msg);
            onSave(res.data.data.maintenance);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 400, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3>Update Maintenance Status</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.9rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Current:</span>
                            <StatusBadge status={record.maintenanceStatus} />
                        </div>

                        <div>
                            <label className="form-label">New Status <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                                ))}
                            </select>
                        </div>

                        {status !== record.maintenanceStatus && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                                <StatusBadge status={record.maintenanceStatus} />
                                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</span>
                                <StatusBadge status={status} />
                            </div>
                        )}

                        {status === 'completed' && (
                            <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#065f46' }}>
                                ✅ Marking as Completed will set the asset status back to <strong>Available</strong>.
                            </div>
                        )}

                        <div>
                            <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <textarea className="form-input" rows={2} placeholder="e.g. Repaired and tested successfully" value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || status === record.maintenanceStatus}>
                            {saving ? 'Saving…' : '✓ Update Status'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Asset Maintenance History Modal ── */
function HistoryModal({ assetId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        maintenanceAPI.getByAsset(assetId)
            .then(res => setData(res.data.data))
            .catch(() => toast.error('Failed to load history'))
            .finally(() => setLoading(false));
    }, [assetId]);

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 680, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>🕐 Maintenance History</h3>
                        {data?.asset && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {data.asset.name} · {data.asset.serialNumber}
                            </span>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><div className="spinner" /></div>
                    ) : !data?.maintenance?.length ? (
                        <div className="empty-state" style={{ padding: '2.5rem 0' }}>
                            <div className="empty-icon">🔧</div>
                            <h3>No maintenance records yet</h3>
                            <p>This asset has no maintenance history.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                {data.maintenance.length} record{data.maintenance.length !== 1 ? 's' : ''} · oldest → newest
                            </div>
                            {data.maintenance.map((r, i) => (
                                <div key={r._id} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '1rem', marginLeft: '0.25rem', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute', left: -7, top: 4,
                                        width: 12, height: 12, borderRadius: '50%',
                                        background: r.maintenanceStatus === 'completed' ? '#10b981' : r.maintenanceStatus === 'in_progress' ? '#f59e0b' : '#6366f1',
                                        border: '2px solid var(--bg-card)',
                                    }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{i + 1}</span>
                                        <StatusBadge status={r.maintenanceStatus} />
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmt(r.createdAt)}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.35rem' }}>{r.description}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {r.repairVendor && <span>🏢 {r.repairVendor}</span>}
                                        {r.repairCost != null && <span>💰 {fmtCost(r.repairCost)}</span>}
                                        {r.repairDate && <span>📅 Repair: {fmt(r.repairDate)}</span>}
                                        {r.createdBy?.name && <span>👤 By: {r.createdBy.name}</span>}
                                    </div>
                                    {r.notes && (
                                        <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem 0.65rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                            📝 {r.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Page ── */
export default function Maintenance() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);
    const [updateRecord, setUpdateRecord] = useState(null);
    const [historyAssetId, setHistoryAssetId] = useState(null);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (search) params.search = search;
            const res = await maintenanceAPI.getAll(params);
            setRecords(res.data.data.maintenance);
        } catch {
            toast.error('Failed to load maintenance records');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const handleNewRecord = (record) => {
        setRecords(prev => [record, ...prev]);
    };

    const handleStatusUpdated = (updated) => {
        setRecords(prev => prev.map(r => r._id === updated._id ? updated : r));
    };

    // Stats derived from all fetched records (unfiltered for accurate totals)
    const [allRecords, setAllRecords] = useState([]);
    useEffect(() => {
        maintenanceAPI.getAll().then(res => setAllRecords(res.data.data.maintenance)).catch(() => { });
    }, [records]);

    const stats = {
        total: allRecords.length,
        pending: allRecords.filter(r => r.maintenanceStatus === 'pending').length,
        in_progress: allRecords.filter(r => r.maintenanceStatus === 'in_progress').length,
        completed: allRecords.filter(r => r.maintenanceStatus === 'completed').length,
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>🔧 Maintenance</h1>
                    <p>Track repair processes, costs, and maintenance history for damaged assets</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>
                    + Log Maintenance
                </button>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Records', value: stats.total, icon: '🗂️', color: '#818cf8' },
                    { label: 'Pending', value: stats.pending, icon: '⏳', color: '#6366f1' },
                    { label: 'In Progress', value: stats.in_progress, icon: '🔄', color: '#f59e0b' },
                    { label: 'Completed', value: stats.completed, icon: '✅', color: '#10b981' },
                ].map(s => (
                    <div key={s.label} className="glass-panel stat-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius)' }}>
                        <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{s.icon}</div>
                        <div className="stat-info">
                            <div className="stat-value" style={{ color: s.color, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                            <div className="stat-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontWeight: 500 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 'var(--radius)' }}>
                <div style={{ flex: '1 1 250px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Records</label>
                    <input
                        className="form-input"
                        placeholder="Asset name or serial number…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ flex: '0 0 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                    <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {records.length} result{records.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="premium-card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e8edf3' }}>
                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : (
                    <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 0 }}>
                        <colgroup>
                            <col style={{ width: '18%' }} />{/* Asset */}
                            <col style={{ width: '22%' }} />{/* Description */}
                            <col style={{ width: '12%' }} />{/* Vendor */}
                            <col style={{ width: '8%' }} /> {/* Cost */}
                            <col style={{ width: '10%' }} />{/* Repair Date */}
                            <col style={{ width: '12%' }} />{/* Logged By */}
                            <col style={{ width: '10%' }} />{/* Status */}
                            <col style={{ width: '8%' }} /> {/* Actions */}
                        </colgroup>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Asset', 'Description', 'Vendor', 'Cost', 'Repair Date', 'Logged By', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>{h}</th>
                                ))}
                                <th style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3', background: '#f8fafc', position: 'sticky', right: 0, boxShadow: '-2px 0 6px rgba(0,0,0,0.04)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr><td colSpan="8">
                                    <div className="empty-state">
                                        <div className="empty-icon">🔧</div>
                                        <h3>No maintenance records found</h3>
                                        <p>Click "+ Log Maintenance" to create the first record.</p>
                                    </div>
                                </td></tr>
                            ) : records.map(r => (
                                <tr
                                    key={r._id}
                                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    {/* Asset */}
                                    <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.asset?.name || '—'}</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.asset?.serialNumber}</div>
                                        <div style={{ marginTop: 4 }}><StatusBadge status={r.asset?.condition} /></div>
                                    </td>

                                    {/* Description */}
                                    <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.83rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>{r.description}</div>
                                        {r.notes && (
                                            <div style={{ fontSize: '0.71rem', color: '#94a3b8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.notes}>📝 {r.notes}</div>
                                        )}
                                    </td>

                                    {/* Vendor */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.repairVendor || '—'}</td>

                                    {/* Cost */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.83rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{fmtCost(r.repairCost)}</td>

                                    {/* Repair Date */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.81rem', color: '#475569', whiteSpace: 'nowrap' }}>{fmt(r.repairDate)}</td>

                                    {/* Logged By */}
                                    <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.createdBy?.name || '—'}</td>

                                    {/* Status */}
                                    <td style={{ padding: '12px 12px' }}><StatusBadge status={r.maintenanceStatus} /></td>

                                    {/* Actions — sticky right */}
                                    <td style={{ padding: '8px 10px', textAlign: 'center', position: 'sticky', right: 0, background: 'inherit', boxShadow: '-2px 0 6px rgba(0,0,0,0.04)', zIndex: 1 }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                            <button
                                                onClick={() => setHistoryAssetId(r.asset?._id)}
                                                title="View maintenance history"
                                                style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', color: '#475569', flexShrink: 0, transition: 'background 0.12s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                                            >🕐</button>
                                            {r.maintenanceStatus !== 'completed' && (
                                                <button
                                                    onClick={() => setUpdateRecord(r)}
                                                    title="Update status"
                                                    style={{ height: 30, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#00478d,#005eb8)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0, transition: 'opacity 0.12s' }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                                >Update</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>


            {/* Modals */}
            {showLogModal && (
                <LogMaintenanceModal
                    onClose={() => setShowLogModal(false)}
                    onSave={handleNewRecord}
                />
            )}
            {updateRecord && (
                <UpdateStatusModal
                    record={updateRecord}
                    onClose={() => setUpdateRecord(null)}
                    onSave={handleStatusUpdated}
                />
            )}
            {historyAssetId && (
                <HistoryModal
                    assetId={historyAssetId}
                    onClose={() => setHistoryAssetId(null)}
                />
            )}
        </div>
    );
}
