import { useState, useEffect, useCallback, useRef } from 'react';
import { assetsAPI, assignmentsAPI, maintenanceAPI, usersAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const CONDITION_OPTIONS = [
    { value: 'new', label: '✨ New' },
    { value: 'good', label: '✅ Good' },
    { value: 'minor_damage', label: '⚠️ Minor Damage' },
    { value: 'major_damage', label: '🔴 Major Damage' },
    { value: 'retired', label: '🗄️ Retired' },
];

const STATUS_FILTERS = ['all', 'available', 'issued', 'return_requested', 'under_maintenance', 'lost'];

function isWarrantyExpiringSoon(expiryDate) {
    if (!expiryDate) return false;
    const diff = new Date(expiryDate) - new Date();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isWarrantyExpired(expiryDate) {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
}

/* ── Assignment info badge shown inline in table ── */
function AssignedToBadge({ assignment }) {
    if (!assignment) return null;
    const initials = assignment.employee?.name
        ?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
            <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.55rem', fontWeight: 800, flexShrink: 0,
            }}>{initials}</div>
            <span style={{ fontSize: '0.71rem', color: '#6366f1', fontWeight: 600 }}>
                {assignment.employee?.name}
            </span>
        </div>
    );
}

/* ── Quick Maintenance Modal (opened from Inventory 🔧 button) ── */
function QuickMaintenanceModal({ asset, onClose, onSave }) {
    const [form, setForm] = useState({ description: '', repairVendor: '', repairCost: '', repairDate: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim()) { return; }
        setSaving(true);
        try {
            const payload = {
                asset: asset._id,
                description: form.description.trim(),
                repairVendor: form.repairVendor.trim() || undefined,
                repairCost: form.repairCost ? Number(form.repairCost) : undefined,
                repairDate: form.repairDate || undefined,
                notes: form.notes.trim() || undefined,
            };
            const res = await maintenanceAPI.create(payload);
            onSave(res.data.data.maintenance);
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to log maintenance';
            import('react-hot-toast').then(({ default: toast }) => toast.error(msg));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 480, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>🔧 Send to Maintenance</h3>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {asset.name} · {asset.serialNumber}
                        </span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label className="form-label">Repair Vendor</label>
                                <input className="form-input" placeholder="e.g. TechFix" value={form.repairVendor} onChange={e => set('repairVendor', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Repair Cost (₹)</label>
                                <input className="form-input" type="number" min="0" placeholder="e.g. 2500" value={form.repairCost} onChange={e => set('repairCost', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Expected Repair Date</label>
                            <input className="form-input" type="date" value={form.repairDate} onChange={e => set('repairDate', e.target.value)} />
                        </div>
                        <div style={{ padding: '0.55rem 0.85rem', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#92400e' }}>
                            ⚠️ Asset will be moved to <strong>Under Maintenance</strong> and a maintenance record will be logged.
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="submit" className="btn btn-warning btn-sm" disabled={saving || !form.description.trim()}>
                            {saving ? 'Saving…' : '🔧 Confirm'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Update Condition Modal ── */
function UpdateConditionModal({ asset, onClose, onSave }) {
    const [condition, setCondition] = useState(asset.condition);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (condition === asset.condition) {
            toast.error('Please select a different condition');
            return;
        }
        setSaving(true);
        try {
            const res = await assetsAPI.updateCondition(asset._id, { condition, notes: notes.trim() || undefined });
            toast.success(`Condition updated to "${condition.replace(/_/g, ' ')}".`);
            onSave(res.data.data.asset);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update condition');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 440, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>Update Condition</h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{asset.serialNumber}</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        {/* Current condition */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.9rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Current:</span>
                            <StatusBadge status={asset.condition} />
                        </div>

                        {/* New condition select */}
                        <div>
                            <label className="form-label">New Condition <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select
                                className="form-select"
                                value={condition}
                                onChange={e => setCondition(e.target.value)}
                                required
                            >
                                {CONDITION_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Optional notes */}
                        <div>
                            <label className="form-label">Reason / Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="e.g. Dropped during transit, screen cracked…"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Change indicator */}
                        {condition !== asset.condition && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 0.9rem',
                                background: 'rgba(99,102,241,0.07)',
                                border: '1px solid rgba(99,102,241,0.22)',
                                borderRadius: 'var(--radius-sm)', fontSize: '0.82rem',
                            }}>
                                <StatusBadge status={asset.condition} />
                                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>→</span>
                                <StatusBadge status={condition} />
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={saving || condition === asset.condition}
                        >
                            {saving ? 'Saving…' : '✓ Update Condition'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Transfer Asset Modal ── */
function TransferAssetModal({ asset, currentAssignment, onClose, onSuccess }) {
    const [employees, setEmployees] = useState([]);
    const [loadingEmps, setLoadingEmps] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [transferNote, setTransferNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            setLoadingEmps(true);
            try {
                const res = await usersAPI.getAll({ role: 'employee' });
                // Exclude the current holder
                const list = (res.data.data.users || []).filter(
                    u => u._id !== currentAssignment?.employee?._id && u.status === 'active' && !u.isDeleted
                );
                setEmployees(list);
            } catch {
                toast.error('Failed to load employees');
            } finally {
                setLoadingEmps(false);
            }
        })();
    }, [currentAssignment]);

    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        return !q ||
            e.name?.toLowerCase().includes(q) ||
            e.email?.toLowerCase().includes(q) ||
            e.department?.toLowerCase().includes(q);
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) { toast.error('Please select a target employee'); return; }
        setSaving(true);
        try {
            await assignmentsAPI.transfer(currentAssignment._id, {
                newEmployeeId: selectedEmployee._id,
                transferNote: transferNote.trim() || undefined,
            });
            toast.success(`Asset transferred to ${selectedEmployee.name}`);
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Transfer failed');
        } finally {
            setSaving(false);
        }
    };

    const fromName = currentAssignment?.employee?.name || '—';

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 520, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.15rem' }}>🔄 Transfer Asset</h3>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {asset.name} · {asset.serialNumber}
                        </span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                        {/* ── Transfer summary banner ── */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(99,102,241,0.07)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 'var(--radius-sm)', fontSize: '0.84rem',
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>FROM</div>
                                <div style={{ fontWeight: 700, color: '#6366f1' }}>{fromName}</div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center', fontSize: '1.3rem', color: 'var(--text-muted)' }}>→</div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 2 }}>TO</div>
                                <div style={{ fontWeight: 700, color: selectedEmployee ? '#10b981' : 'var(--text-muted)', fontStyle: selectedEmployee ? 'normal' : 'italic' }}>
                                    {selectedEmployee ? selectedEmployee.name : 'Select below…'}
                                </div>
                            </div>
                        </div>

                        {/* ── Employee search/select ── */}
                        <div>
                            <label className="form-label">Select Target Employee <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input
                                className="form-input"
                                placeholder="Search by name, email or department…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setSelectedEmployee(null); }}
                                autoFocus
                            />
                        </div>

                        {/* Employee list */}
                        <div style={{
                            maxHeight: 200, overflowY: 'auto',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        }}>
                            {loadingEmps ? (
                                <div style={{ padding: '1rem', textAlign: 'center' }}><div className="spinner" /></div>
                            ) : filtered.length === 0 ? (
                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                                    {search ? 'No employees match your search' : 'No other active employees found'}
                                </div>
                            ) : filtered.map(emp => {
                                const isSelected = selectedEmployee?._id === emp._id;
                                const initials = emp.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                                return (
                                    <div
                                        key={emp._id}
                                        onClick={() => setSelectedEmployee(emp)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.7rem',
                                            padding: '0.6rem 0.9rem', cursor: 'pointer',
                                            background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
                                            borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                                            transition: 'background 0.12s',
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <div style={{
                                            width: 30, height: 30, borderRadius: '50%',
                                            background: isSelected ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--bg-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isSelected ? '#fff' : 'var(--text-secondary)',
                                            fontSize: '0.6rem', fontWeight: 800, flexShrink: 0, border: '1px solid var(--border)',
                                        }}>{initials}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{emp.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                                                <span>{emp.department || 'No Department'}</span>
                                                <span>·</span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{emp.email}</span>
                                            </div>
                                        </div>
                                        {isSelected && <span style={{ color: '#6366f1', fontSize: '1rem' }}>✓</span>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Transfer Reason ── */}
                        <div>
                            <label className="form-label">Transfer Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                            <textarea
                                className="form-input"
                                rows={2}
                                placeholder="e.g. Employee relocation, role change, faulty unit swap…"
                                value={transferNote}
                                onChange={e => setTransferNote(e.target.value)}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Info notice */}
                        <div style={{
                            padding: '0.55rem 0.85rem',
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.22)',
                            borderRadius: 'var(--radius-sm)', fontSize: '0.79rem', color: '#065f46',
                        }}>
                            ℹ️ The current assignment will be marked as <strong>Transferred</strong> and a new assignment will be created for the selected employee. Asset history is fully preserved.
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={saving || !selectedEmployee}
                        >
                            {saving ? 'Transferring…' : '🔄 Confirm Transfer'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AssetDetailModal({ asset, assignment, onClose, onStatusUpdate, onConditionUpdate, onMaintenance, onTransfer }) {
    const [imgIdx, setImgIdx] = useState(0);
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyCached, setHistoryCached] = useState(false);
    const images = asset.images || [];

    // Lazy-load history only when tab is opened the first time
    const loadHistory = useCallback(async () => {
        if (historyCached) return;
        setHistoryLoading(true);
        try {
            const res = await assetsAPI.getHistory(asset._id);
            setHistory(res.data.data.history);
            setHistoryCached(true);
        } catch {
            toast.error('Failed to load assignment history');
        } finally {
            setHistoryLoading(false);
        }
    }, [asset._id, historyCached]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'history') loadHistory();
    };

    const tabStyle = (tab) => ({
        padding: '0.5rem 1.1rem',
        fontSize: '0.82rem',
        fontWeight: 700,
        border: 'none',
        borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
        background: 'none',
        color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
    });

    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 760, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                {/* ── Header ── */}
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3 style={{ marginBottom: '0.2rem' }}>{asset.name}</h3>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{asset.serialNumber}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <StatusBadge status={asset.condition} />
                        <StatusBadge status={asset.status} />
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingLeft: '1.25rem', gap: '0.25rem' }}>
                    <button style={tabStyle('details')} onClick={() => handleTabChange('details')}>📋 Details</button>
                    <button style={tabStyle('history')} onClick={() => handleTabChange('history')}>🕐 Assignment History</button>
                </div>

                {/* ── Tab: Details ── */}
                {activeTab === 'details' && (
                    <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: images.length ? '220px 1fr' : '1fr', gap: '1.5rem' }}>
                        {/* Image Viewer */}
                        {images.length > 0 && (
                            <div>
                                <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '0.5rem', aspectRatio: '1' }}>
                                    <img src={images[imgIdx]?.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                {images.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {images.map((img, i) => (
                                            <div key={i} onClick={() => setImgIdx(i)}
                                                style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: `2px solid ${i === imgIdx ? 'var(--accent)' : 'var(--border)'}`, flexShrink: 0 }}>
                                                <img src={img.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* ── Currently Issued panel ── */}
                            {assignment && (
                                <div style={{
                                    background: 'rgba(99,102,241,0.07)',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                    borderRadius: 'var(--radius-sm)', padding: '0.875rem 1rem',
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1', marginBottom: '0.75rem' }}>
                                        📤 Currently Issued To
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.84rem' }}>
                                        {[
                                            ['Employee', assignment.employee?.name || '—'],
                                            ['Department', assignment.employee?.department || '—'],
                                            ['Email', assignment.employee?.email || '—'],
                                            ['Issued By', assignment.assignedBy?.name || '—'],
                                            ['Issue Date', assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                                            ['Assignment Status', assignment.status],
                                        ].map(([label, val]) => (
                                            <div key={label} style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 6, padding: '0.4rem 0.65rem' }}>
                                                <div style={{ fontSize: '0.68rem', color: '#6366f1', marginBottom: '0.15rem', fontWeight: 600 }}>{label}</div>
                                                <div style={{ fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-all' }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Core Details */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Core Details</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.84rem' }}>
                                    {[
                                        ['Category', asset.category],
                                        ['Brand', asset.brand || '—'],
                                        ['Asset Type', asset.assetType || 'movable'],
                                        ['Location', asset.location || '—'],
                                        ['Vendor', asset.vendor || '—'],
                                        ['Purchase Date', asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-IN') : '—'],
                                        ['Purchase Price', asset.purchasePrice ? `₹${Number(asset.purchasePrice).toLocaleString('en-IN')}` : '—'],
                                        ['Added On', new Date(asset.createdAt).toLocaleDateString('en-IN')],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
                                            <div style={{ fontWeight: 600 }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Warranty */}
                            {(asset.warranty?.provider || asset.warranty?.expiryDate) && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>🛡️ Warranty</div>
                                    <div style={{
                                        padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem',
                                        border: `1px solid ${isWarrantyExpired(asset.warranty?.expiryDate) ? 'var(--danger)' : isWarrantyExpiringSoon(asset.warranty?.expiryDate) ? 'var(--warning)' : 'var(--border)'}`,
                                        background: isWarrantyExpired(asset.warranty?.expiryDate) ? 'rgba(239,68,68,0.05)' : isWarrantyExpiringSoon(asset.warranty?.expiryDate) ? 'rgba(245,158,11,0.05)' : 'var(--bg-secondary)',
                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem',
                                    }}>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Provider</div>
                                            <div style={{ fontWeight: 600 }}>{asset.warranty.provider || '—'}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Expiry Date</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {asset.warranty.expiryDate ? new Date(asset.warranty.expiryDate).toLocaleDateString('en-IN') : '—'}
                                                {isWarrantyExpired(asset.warranty?.expiryDate) && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', marginLeft: 6 }}>EXPIRED</span>}
                                                {isWarrantyExpiringSoon(asset.warranty?.expiryDate) && <span style={{ color: 'var(--warning)', fontSize: '0.72rem', marginLeft: 6 }}>Expiring Soon</span>}
                                            </div>
                                        </div>
                                        {asset.warranty.notes && (
                                            <div style={{ gridColumn: '1 / -1', paddingTop: '0.4rem', borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                {asset.warranty.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {asset.notes && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Notes</div>
                                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>{asset.notes}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Assignment History ── */}
                {activeTab === 'history' && (
                    <div className="modal-body" style={{ padding: '1.25rem' }}>
                        {historyLoading ? (
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {history.length} assignment record{history.length !== 1 ? 's' : ''} · oldest → newest
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>returned</span>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', marginLeft: '0.5rem' }} />
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>issued</span>
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '0.5rem' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 32 }}>#</th>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Assigned By</th>
                                                <th>Issue Date</th>
                                                <th>Return Date</th>
                                                <th>Condition at Return</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map((h, idx) => {
                                                const isLast = idx === history.length - 1;
                                                return (
                                                    <tr key={h._id} style={{
                                                        background: isLast && h.status === 'issued' ? 'rgba(245,158,11,0.04)' : '',
                                                        borderLeft: isLast && h.status === 'issued' ? '3px solid #f59e0b' : '3px solid transparent',
                                                    }}>
                                                        {/* Era number */}
                                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                                                            {idx + 1}
                                                        </td>

                                                        {/* Employee */}
                                                        <td>
                                                            {h.employee ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                    <div style={{
                                                                        width: 26, height: 26, borderRadius: '50%',
                                                                        background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        color: '#fff', fontSize: '0.58rem', fontWeight: 800, flexShrink: 0,
                                                                    }}>
                                                                        {h.employee.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{h.employee.name}</div>
                                                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{h.employee.email}</div>
                                                                    </div>
                                                                </div>
                                                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                        </td>

                                                        {/* Department */}
                                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                            {h.employee?.department || '—'}
                                                        </td>

                                                        {/* Assigned By */}
                                                        <td style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                                                            {h.assignedBy?.name || '—'}
                                                        </td>

                                                        {/* Issue Date */}
                                                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                            {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>

                                                        {/* Return Date */}
                                                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                            {h.status === 'returned'
                                                                ? new Date(h.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                        </td>

                                                        {/* Condition at Return */}
                                                        <td>
                                                            {h.returnCondition
                                                                ? <StatusBadge status={h.returnCondition} />
                                                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                                                        </td>

                                                        {/* Status */}
                                                        <td>
                                                            <StatusBadge status={h.status} />
                                                            {h.notes && (
                                                                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.notes}>
                                                                    📝 {h.notes}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Footer — only shown in Details tab ── */}
                {activeTab === 'details' && (
                    <div className="modal-footer">
                        {asset.status === 'issued' && assignment && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => { onTransfer(asset, assignment); onClose(); }}
                            >
                                🔄 Transfer Asset
                            </button>
                        )}
                        {asset.status === 'available' && (
                            <button className="btn btn-warning btn-sm" onClick={() => { onMaintenance(asset); onClose(); }}>
                                🔧 Send to Maintenance
                            </button>
                        )}
                        {asset.status === 'under_maintenance' && (
                            <button className="btn btn-success btn-sm" onClick={() => { onStatusUpdate(asset._id, 'available'); onClose(); }}>
                                ✓ Mark as Repaired
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => onConditionUpdate(asset)}>
                            🏷️ Update Condition
                        </button>
                        <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    </div>
                )}
                {activeTab === 'history' && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Row Action Menu (kebab ⋮ dropdown) ── */
function RowActionMenu({ asset, assignment, onView, onCondition, onTransfer, onMaintenance, onMarkRepaired, isOpen, onToggle, onClose }) {
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const btnRef = useRef(null);

    // Close on outside click - only when this specific menu is open
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
            const menuH = 200;
            const top = spaceBelow > menuH ? rect.bottom + 6 : rect.top - menuH - 6;
            const right = window.innerWidth - rect.right;
            setMenuPos({ top, right });
        }
        onToggle();
    };

    const act = (fn) => {
        onClose();
        fn();
    };

    const menuItems = [
        {
            label: 'View Details',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            ),
            onClick: () => act(onView),
        },
        {
            label: 'Update Condition',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            onClick: () => act(onCondition),
        },
        asset.status === 'issued' && assignment ? {
            label: 'Transfer Asset',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
            ),
            onClick: () => act(onTransfer),
            accent: '#7c3aed',
            divider: true,
        } : null,
        asset.status === 'available' ? {
            label: 'Send to Maintenance',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
            ),
            onClick: () => act(onMaintenance),
            divider: true,
        } : null,
        asset.status === 'under_maintenance' ? {
            label: 'Mark as Repaired',
            icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ),
            onClick: () => act(onMarkRepaired),
            accent: '#059669',
            divider: true,
        } : null,
    ].filter(Boolean);

    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Trigger button */}
            <button
                ref={btnRef}
                onClick={toggle}
                title="Actions"
                style={{
                    width: 32, height: 32,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#f1f5f9' : 'transparent',
                    border: `1.5px solid ${isOpen ? '#cbd5e1' : 'transparent'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: isOpen ? '#334155' : '#94a3b8',
                    padding: 0,
                }}
                onMouseEnter={e => {
                    if (!isOpen) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#475569';
                    }
                }}
                onMouseLeave={e => {
                    if (!isOpen) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = '#94a3b8';
                    }
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                </svg>
            </button>

            {/* Dropdown — rendered via fixed positioning so it escapes table overflow */}
            {isOpen && (
                <div
                    data-row-menu-popup
                    style={{
                        position: 'fixed',
                        top: menuPos.top,
                        right: menuPos.right,
                        zIndex: 9999,
                        width: 210,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        boxShadow: '0 8px 32px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
                        padding: '6px',
                        animation: 'menuSlideIn 0.14s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    {menuItems.map((item, i) => (
                        <div key={i}>
                            {item.divider && i > 0 && (
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />
                            )}
                            <button
                                onClick={item.onClick}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    color: item.accent || '#334155',
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    fontFamily: 'inherit',
                                    textAlign: 'left',
                                    transition: 'background 0.1s, color 0.1s',
                                    letterSpacing: '0.01em',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = item.accent
                                        ? `${item.accent}0f`
                                        : '#f8fafc';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <span style={{
                                    width: 28, height: 28,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: item.accent ? `${item.accent}12` : '#f1f5f9',
                                    borderRadius: 7,
                                    flexShrink: 0,
                                    color: item.accent || '#64748b',
                                }}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Inventory() {
    const [assets, setAssets] = useState([]);
    const [assignmentMap, setAssignmentMap] = useState({}); // assetId → assignment
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [conditionAsset, setConditionAsset] = useState(null);
    const [quickMaintAsset, setQuickMaintAsset] = useState(null);
    const [transferTarget, setTransferTarget] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null); // only one menu open at a time
    const fetchInventory = async () => {
        setLoading(true);
        try {
            // Always fetch ALL assets — filtering is done client-side so stat cards stay accurate
            const [assetRes, assignRes] = await Promise.all([
                assetsAPI.getAll(),
                assignmentsAPI.getAll({ status: 'issued' }),
            ]);

            setAssets(assetRes.data.data.assets);

            // Build a map: assetId → assignment for O(1) lookup in the table
            const map = {};
            assignRes.data.data.assignments.forEach(a => {
                if (a.asset?._id) map[a.asset._id] = a;
            });
            setAssignmentMap(map);
        } catch {
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []); // fetch once — filtering is client-side

    const updateStatus = async (id, status) => {
        try {
            await assetsAPI.updateStatus(id, { status });
            toast.success('Asset status updated');
            fetchInventory();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };

    // Called after QuickMaintenanceModal submits — refresh inventory so status reflects
    const handleMaintenanceLogged = () => {
        toast.success('Asset sent to maintenance & record logged');
        fetchInventory();
    };

    // Called after TransferAssetModal succeeds
    const handleTransferSuccess = () => {
        fetchInventory();
    };

    const openTransferModal = (asset, assignment, e) => {
        if (e) e.stopPropagation();
        setTransferTarget({ asset, assignment });
    };

    // Called by UpdateConditionModal on success — patch asset in local state immediately
    const handleConditionSaved = (updatedAsset) => {
        setAssets(prev => prev.map(a => a._id === updatedAsset._id ? { ...a, condition: updatedAsset.condition } : a));
        // Also refresh selectedAsset if the detail modal is open for the same asset
        if (selectedAsset?._id === updatedAsset._id) {
            setSelectedAsset(prev => ({ ...prev, condition: updatedAsset.condition }));
        }
    };

    const openConditionModal = (asset, e) => {
        if (e) e.stopPropagation();
        setConditionAsset(asset);
    };

    // Apply BOTH status filter and search client-side so stat cards always reflect full totals
    const filtered = assets.filter(a => {
        const matchesStatus = filter === 'all' || a.status === filter;
        const q = search.toLowerCase();
        const matchesSearch = !search ||
            a.name.toLowerCase().includes(q) ||
            a.serialNumber?.toLowerCase().includes(q) ||
            a.category?.toLowerCase().includes(q) ||
            assignmentMap[a._id]?.employee?.name?.toLowerCase().includes(q);
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: assets.length,
        available: assets.filter(a => a.status === 'available').length,
        issued: assets.filter(a => a.status === 'issued').length,
        maintenance: assets.filter(a => a.status === 'under_maintenance').length,
    };

    // For open modal — find fresh assignment from map
    const selectedAssignment = selectedAsset ? assignmentMap[selectedAsset._id] : null;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Store Inventory</h1>
                    <p>Full view of all registered assets, their status, and current holders</p>
                </div>
            </div>

            {/* Quick Stats — clickable filter cards */}
            <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
                {[
                    { label: 'Total Assets', value: stats.total, icon: '📦', color: '#818cf8', filterKey: 'all' },
                    { label: 'Available', value: stats.available, icon: '✅', color: '#10b981', filterKey: 'available' },
                    { label: 'Issued Out', value: stats.issued, icon: '📤', color: '#f59e0b', filterKey: 'issued' },
                    { label: 'In Maintenance', value: stats.maintenance, icon: '🔧', color: '#ef4444', filterKey: 'under_maintenance' },
                ].map(s => {
                    const isActive = filter === s.filterKey;
                    return (
                        <div
                            key={s.label}
                            className="glass-panel stat-card"
                            onClick={() => setFilter(isActive ? 'all' : s.filterKey)}
                            style={{
                                cursor: 'pointer',
                                outline: isActive ? `2px solid ${s.color}` : '2px solid transparent',
                                outlineOffset: 2,
                                transition: 'outline 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                                transform: isActive ? 'translateY(-2px)' : '',
                                boxShadow: isActive ? `0 6px 20px ${s.color}28` : '',
                                userSelect: 'none',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.transform = ''; }}
                        >
                            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: isActive ? s.color : '' }}>{s.value}</div>
                                <div className="stat-label">{s.label}</div>
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
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search Inventory</label>
                    <input className="form-input" placeholder="Name, serial, category or employee…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ flex: '0 0 200px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter by Status</label>
                    <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        {STATUS_FILTERS.map(s => (
                            <option key={s} value={s}>{s === 'all' ? 'All Assets' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="premium-card" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e8edf3' }}>
                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : (
                    <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 0 }}>
                        <colgroup>
                            <col style={{ width: '22%' }} />{/* Asset */}
                            <col style={{ width: '12%' }} />{/* Brand */}
                            <col style={{ width: '10%' }} />{/* Category */}
                            <col style={{ width: '11%' }} />{/* Serial No. */}
                            <col style={{ width: '18%' }} />{/* Issued To */}
                            <col style={{ width: '10%' }} />{/* Condition */}
                            <col style={{ width: '10%' }} />{/* Status */}
                            <col style={{ width: '7%' }} /> {/* Actions */}
                        </colgroup>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Asset</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Brand</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Category</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Serial No.</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Issued To</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Condition</th>
                                <th style={{ padding: '12px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3' }}>Status</th>
                                <th style={{ padding: '12px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e8edf3', background: '#f8fafc', position: 'sticky', right: 0, boxShadow: '-2px 0 6px rgba(0,0,0,0.04)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan="8">
                                    <div className="empty-state">
                                        <div className="empty-icon">📦</div>
                                        <h3>No assets found</h3>
                                        <p>Try changing your filters or add new assets from the "Add Asset" page.</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map(asset => {
                                const assignment = assignmentMap[asset._id];
                                return (
                                    <tr
                                        key={asset._id}
                                        style={{ cursor: 'pointer', transition: 'background 0.12s', borderBottom: '1px solid #f1f5f9' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                        onClick={() => setSelectedAsset(asset)}
                                    >
                                        {/* Asset */}
                                        <td style={{ padding: '12px 16px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                                    {asset.images?.length > 0
                                                        ? <img src={asset.images[0].data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : ({ Laptop: '💻', Tablet: '📱', Phone: '📞', Peripheral: '🖱️', 'ID Card': '🪪', Book: '📚', Monitor: '🖥️', Keyboard: '⌨️' }[asset.category] || '📦')
                                                    }
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
                                                    {asset.vendor && <div style={{ fontSize: '0.71rem', color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.vendor}</div>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Brand */}
                                        <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {asset.brand || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>

                                        {/* Category */}
                                        <td style={{ padding: '12px 12px', fontSize: '0.82rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.category}</td>

                                        {/* Serial No. */}
                                        <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: 5, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.serialNumber}</span>
                                        </td>

                                        {/* Issued To */}
                                        <td style={{ padding: '12px 12px', overflow: 'hidden' }}>
                                            {assignment ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>
                                                        {assignment.employee?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignment.employee?.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignment.employee?.department || ''}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Unassigned</span>
                                            )}
                                        </td>

                                        {/* Condition */}
                                        <td style={{ padding: '12px 12px' }}><StatusBadge status={asset.condition} /></td>

                                        {/* Status */}
                                        <td style={{ padding: '12px 12px' }}><StatusBadge status={asset.status} /></td>

                                        {/* Actions — sticky right */}
                                        <td
                                            onClick={e => e.stopPropagation()}
                                            style={{ padding: '8px 12px', textAlign: 'center', position: 'sticky', right: 0, background: 'inherit', boxShadow: '-2px 0 6px rgba(0,0,0,0.04)', zIndex: 1 }}
                                        >
                                            <RowActionMenu
                                                asset={asset}
                                                assignment={assignment}
                                                isOpen={openMenuId === asset._id}
                                                onToggle={() => setOpenMenuId(prev => prev === asset._id ? null : asset._id)}
                                                onClose={() => setOpenMenuId(null)}
                                                onView={() => setSelectedAsset(asset)}
                                                onCondition={() => openConditionModal(asset)}
                                                onTransfer={() => openTransferModal(asset, assignment)}
                                                onMaintenance={() => setQuickMaintAsset(asset)}
                                                onMarkRepaired={() => updateStatus(asset._id, 'available')}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedAsset && (
                <AssetDetailModal
                    asset={selectedAsset}
                    assignment={selectedAssignment}
                    onClose={() => setSelectedAsset(null)}
                    onStatusUpdate={updateStatus}
                    onConditionUpdate={(asset) => { setSelectedAsset(null); openConditionModal(asset); }}
                    onMaintenance={(asset) => { setSelectedAsset(null); setQuickMaintAsset(asset); }}
                    onTransfer={(asset, assignment) => { setSelectedAsset(null); openTransferModal(asset, assignment); }}
                />
            )}

            {conditionAsset && (
                <UpdateConditionModal
                    asset={conditionAsset}
                    onClose={() => setConditionAsset(null)}
                    onSave={handleConditionSaved}
                />
            )}

            {quickMaintAsset && (
                <QuickMaintenanceModal
                    asset={quickMaintAsset}
                    onClose={() => setQuickMaintAsset(null)}
                    onSave={handleMaintenanceLogged}
                />
            )}

            {transferTarget && (
                <TransferAssetModal
                    asset={transferTarget.asset}
                    currentAssignment={transferTarget.assignment}
                    onClose={() => setTransferTarget(null)}
                    onSuccess={handleTransferSuccess}
                />
            )}
        </div>
    );
}
