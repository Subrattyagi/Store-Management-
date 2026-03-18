import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { assetsAPI } from '../../api';
import toast from 'react-hot-toast';

/* ────────────────── constants ────────────────── */
const CATEGORIES = [
    'Laptop', 'Tablet', 'Phone', 'Peripheral', 'ID Card',
    'Book', 'Monitor', 'Keyboard', 'Mouse', 'Headset', 'Other',
];

const EMPTY_ENTRY = {
    serialNumber: '', location: '', notes: '',
    warranty: { provider: '', expiryDate: '', notes: '' },
    images: [], previewImages: [],
};

const EMPTY_COMMON = {
    name: '', vendor: '', category: '', condition: 'new',
};

/* ────────────────── sub-components ────────────────── */

/** Full-screen overlay modal for picking Movable vs Fixed */
function TypeSelectionModal({ onSelect }) {
    const types = [
        {
            key: 'movable',
            icon: '📦',
            title: 'Movable',
            desc: 'Laptops, phones, peripherals',
            gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
            bgHover: 'rgba(99,102,241,0.06)',
            borderColor: '#818cf8',
        },
        {
            key: 'fixed',
            icon: '🏢',
            title: 'Fixed',
            desc: 'Furniture, machinery...',
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            bgHover: 'rgba(16,185,129,0.06)',
            borderColor: '#34d399',
        },
    ];

    return (
        <div className="glass-modal-overlay" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.25)' }}>
            <div style={{
                background: 'var(--surface)',
                borderRadius: '1.5rem',
                border: '1px solid rgba(226, 232, 240, 0.6)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                padding: '1.5rem',
                width: 420,
                animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: '-25%', left: '-15%', width: '130%', height: '130%', background: 'radial-gradient(circle at top left, rgba(99,102,241,0.06), transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

                <div style={{ textAlign: 'center', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-flex', padding: '0.35rem 0.8rem', background: 'var(--bg-secondary)', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.875rem', border: '1px solid var(--border)', textTransform: 'uppercase' }}>
                        Start Registration
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)' }}>Asset Category</h2>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                    {types.map(t => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onSelect(t.key)}
                            style={{
                                flex: 1,
                                padding: '1.25rem 1rem',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                borderRadius: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '0.875rem',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.border = `1px solid ${t.borderColor}`;
                                e.currentTarget.style.background = t.bgHover;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                const iconWrap = e.currentTarget.querySelector('.icon-wrapper');
                                if (iconWrap) {
                                    iconWrap.style.transform = 'scale(1.1) translateY(-2px)';
                                    iconWrap.style.boxShadow = `0 8px 20px -4px ${t.borderColor}40`;
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.border = '1px solid var(--border)';
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = '';
                                const iconWrap = e.currentTarget.querySelector('.icon-wrapper');
                                if (iconWrap) {
                                    iconWrap.style.transform = '';
                                    iconWrap.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                                }
                            }}
                        >
                            <div className="icon-wrapper" style={{
                                width: 46, height: 46, borderRadius: '50%',
                                background: t.gradient, color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.25rem', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                            }}>{t.icon}</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.2rem' }}>{t.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(30px) scale(0.96); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

/** Image uploader / previewer for a single entry */
function ImageUploader({ previewImages, onChange, onRemove }) {
    const fileRef = useRef();
    const remaining = 5 - previewImages.length;

    const handleFiles = (e) => {
        const files = Array.from(e.target.files).slice(0, remaining);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imgObj = { data: reader.result, name: file.name, uploadedAt: new Date().toISOString() };
                onChange(imgObj, reader.result);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    return (
        <div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            {remaining > 0 && (
                <div
                    onClick={() => fileRef.current.click()}
                    style={{
                        border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                        padding: '1.25rem', textAlign: 'center', cursor: 'pointer',
                        transition: 'all 0.2s', marginBottom: previewImages.length ? '0.75rem' : 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>📁</div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>Click to upload photos</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        PNG, JPG, GIF — max {remaining} image{remaining !== 1 ? 's' : ''} remaining
                    </div>
                </div>
            )}
            {previewImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                    {previewImages.map((src, i) => (
                        <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--border)' }}>
                            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                                type="button"
                                onClick={() => onRemove(i)}
                                style={{
                                    position: 'absolute', top: 3, right: 3,
                                    background: 'rgba(239,68,68,0.9)', border: 'none',
                                    borderRadius: '50%', width: 18, height: 18,
                                    cursor: 'pointer', color: '#fff', fontSize: '0.65rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ────────────────── main component ────────────────── */
export default function AddAsset() {
    const [assetType, setAssetType] = useState(null); // null → show modal
    const [common, setCommon] = useState(EMPTY_COMMON);
    const [commonLocked, setCommonLocked] = useState(false);
    const [entries, setEntries] = useState([{ ...EMPTY_ENTRY }]);
    const [loading, setLoading] = useState(false);
    const [registered, setRegistered] = useState(null); // success list

    /* ── common field handlers ── */
    const handleCommon = (e) => setCommon(p => ({ ...p, [e.target.name]: e.target.value }));

    /* ── entry helpers ── */
    const updateEntry = (idx, field, value) =>
        setEntries(p => p.map((en, i) => i === idx ? { ...en, [field]: value } : en));

    const updateEntryWarranty = (idx, e) =>
        setEntries(p => p.map((en, i) =>
            i === idx ? { ...en, warranty: { ...en.warranty, [e.target.name]: e.target.value } } : en
        ));

    const addEntry = () => {
        if (!commonLocked && entries.length > 0) setCommonLocked(true);
        setEntries(p => [...p, { ...EMPTY_ENTRY }]);
    };

    const removeEntry = (idx) => {
        if (entries.length === 1) return; // always keep one
        setEntries(p => p.filter((_, i) => i !== idx));
    };

    const addImage = (idx, imgObj, preview) => {
        setEntries(p => p.map((en, i) =>
            i === idx
                ? { ...en, images: [...en.images, imgObj].slice(0, 5), previewImages: [...en.previewImages, preview].slice(0, 5) }
                : en
        ));
    };

    const removeImage = (idx, imgIdx) => {
        setEntries(p => p.map((en, i) =>
            i === idx
                ? { ...en, images: en.images.filter((_, j) => j !== imgIdx), previewImages: en.previewImages.filter((_, j) => j !== imgIdx) }
                : en
        ));
    };

    /* ── reset everything ── */
    const resetAll = () => {
        setAssetType(null);
        setCommon(EMPTY_COMMON);
        setCommonLocked(false);
        setEntries([{ ...EMPTY_ENTRY }]);
        setRegistered(null);
    };

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const commonFields = { ...common, assetType };
            const cleanEntries = entries.map(({ previewImages: _, ...rest }) => rest);
            const res = await assetsAPI.createBulk({ commonFields, entries: cleanEntries });
            setRegistered(res.data.data.assets);
            toast.success(`${res.data.results} asset${res.data.results > 1 ? 's' : ''} registered!`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to register assets';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    /* ── type badge helper ── */
    const typeBadge = assetType === 'movable'
        ? { label: '📦 Movable Asset', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' }
        : { label: '🏢 Fixed Asset', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };

    /* ── render ── */
    return (
        <div>
            {/* Type selection modal */}
            {!assetType && <TypeSelectionModal onSelect={setAssetType} />}

            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Add New Asset</h1>
                    <p>Register one or multiple assets into the central inventory</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {assetType && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={resetAll}>
                            🔄 Change Type
                        </button>
                    )}
                    <Link to="/store-manager/inventory" className="btn btn-ghost">
                        📦 View Inventory
                    </Link>
                </div>
            </div>

            {/* ── Success state ── */}
            {registered && (
                <div style={{
                    background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <div style={{ width: 40, height: 40, background: 'rgba(16,185,129,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>✅</div>
                        <div>
                            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem' }}>
                                {registered.length} asset{registered.length > 1 ? 's' : ''} registered successfully!
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#047857' }}>All assets are now available in inventory</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        {registered.map((a, i) => (
                            <span key={i} style={{
                                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                                borderRadius: 6, padding: '0.3rem 0.65rem', fontSize: '0.78rem',
                                fontFamily: 'monospace', color: '#065f46', fontWeight: 600,
                            }}>{a.serialNumber}</span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link to="/store-manager/inventory" className="btn btn-success btn-sm">View in Inventory →</Link>
                        <button className="btn btn-ghost btn-sm" onClick={resetAll}>➕ Add More Assets</button>
                    </div>
                </div>
            )}

            {!registered && (
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem', alignItems: 'start' }}>

                        {/* ── LEFT COLUMN ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* ── Common Fields Card ── */}
                            <div className="premium-card">
                                <div className="section-header" style={{ marginBottom: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div className="section-title">🗂️ Common Details</div>
                                            <div className="section-subtitle">
                                                {commonLocked
                                                    ? 'Shared across all entries below — click "Edit" to change'
                                                    : 'These fields will be shared across all assets in this batch'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {assetType && (
                                                <span style={{
                                                    background: typeBadge.bg, color: typeBadge.color,
                                                    border: `1px solid ${typeBadge.color}40`,
                                                    borderRadius: 20, padding: '0.25rem 0.75rem',
                                                    fontSize: '0.78rem', fontWeight: 700,
                                                }}>{typeBadge.label}</span>
                                            )}
                                            {commonLocked && (
                                                <button type="button" className="btn btn-ghost btn-sm"
                                                    onClick={() => { setCommonLocked(false); setEntries([{ ...EMPTY_ENTRY }]); }}
                                                    title="Edit common fields (resets all entries)"
                                                >✏️ Edit</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                                        <label className="form-label">Asset Name / Model *</label>
                                        <input
                                            type="text" className="form-input" name="name"
                                            value={common.name} onChange={handleCommon}
                                            required disabled={commonLocked}
                                            placeholder="e.g. Dell Latitude 5540"
                                            style={commonLocked ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Company / Vendor</label>
                                        <input
                                            type="text" className="form-input" name="vendor"
                                            value={common.vendor} onChange={handleCommon}
                                            disabled={commonLocked}
                                            placeholder="e.g. Dell India"
                                            style={commonLocked ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Category *</label>
                                        <select
                                            className="form-select" name="category"
                                            value={common.category} onChange={handleCommon}
                                            required disabled={commonLocked}
                                            style={commonLocked ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
                                        >
                                            <option value="" disabled>Select category</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Initial Condition *</label>
                                        <select
                                            className="form-select" name="condition"
                                            value={common.condition} onChange={handleCommon}
                                            disabled={commonLocked}
                                            style={commonLocked ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
                                        >
                                            <option value="new">🟢 New</option>
                                            <option value="good">🔵 Good</option>
                                            <option value="minor_damage">🟡 Minor Damage</option>
                                            <option value="major_damage">🟠 Major Damage</option>
                                            <option value="retired">⛔ Retired</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── Per-Asset Entries ── */}
                            {entries.map((entry, idx) => (
                                <div key={idx} className="premium-card" style={{ border: '1px solid var(--border)', position: 'relative' }}>
                                    {/* Entry header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem',
                                    }}>
                                        <div>
                                            <div className="section-title">
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: 'var(--accent)', color: '#fff',
                                                    fontSize: '0.72rem', fontWeight: 800, marginRight: '0.5rem',
                                                }}>{idx + 1}</span>
                                                Asset Entry #{idx + 1}
                                            </div>
                                            <div className="section-subtitle">Unique details for this individual asset</div>
                                        </div>
                                        {entries.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeEntry(idx)}
                                                style={{
                                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                                    color: 'var(--danger)', borderRadius: 'var(--radius-sm)',
                                                    padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                            >🗑 Remove</button>
                                        )}
                                    </div>

                                    {/* Serial + Location */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Serial Number *</label>
                                            <input
                                                type="text" className="form-input"
                                                value={entry.serialNumber}
                                                onChange={e => updateEntry(idx, 'serialNumber', e.target.value)}
                                                required placeholder="e.g. SN-2024-001"
                                                style={{ fontFamily: 'monospace' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Storage Location</label>
                                            <input
                                                type="text" className="form-input"
                                                value={entry.location}
                                                onChange={e => updateEntry(idx, 'location', e.target.value)}
                                                placeholder="e.g. Shelf B-3"
                                            />
                                        </div>
                                    </div>

                                    {/* Warranty */}
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                            🛡️ Warranty
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Provider</label>
                                                <input
                                                    type="text" className="form-input" name="provider"
                                                    value={entry.warranty.provider}
                                                    onChange={e => updateEntryWarranty(idx, e)}
                                                    placeholder="e.g. Dell Care"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Expiry Date</label>
                                                <input
                                                    type="date" className="form-input" name="expiryDate"
                                                    value={entry.warranty.expiryDate}
                                                    onChange={e => updateEntryWarranty(idx, e)}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                                                <label className="form-label">Warranty Notes</label>
                                                <input
                                                    type="text" className="form-input" name="notes"
                                                    value={entry.warranty.notes}
                                                    onChange={e => updateEntryWarranty(idx, e)}
                                                    placeholder="e.g. On-site support, 3-year"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                        <label className="form-label">Internal Notes</label>
                                        <textarea
                                            className="form-textarea"
                                            value={entry.notes}
                                            onChange={e => updateEntry(idx, 'notes', e.target.value)}
                                            placeholder="Any extra info about this specific unit..."
                                            rows={2}
                                        />
                                    </div>

                                    {/* Photos */}
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                            📷 Photos
                                        </div>
                                        <ImageUploader
                                            images={entry.images}
                                            previewImages={entry.previewImages}
                                            onChange={(imgObj, preview) => addImage(idx, imgObj, preview)}
                                            onRemove={(imgIdx) => removeImage(idx, imgIdx)}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Add Another button */}
                            <button
                                type="button"
                                onClick={addEntry}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    width: '100%', padding: '0.875rem',
                                    border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                                    background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)',
                                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.18s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.color = 'var(--accent)';
                                    e.currentTarget.style.background = 'rgba(99,102,241,0.04)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                ➕ Add Another Asset
                                {entries.length > 0 && (
                                    <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>
                                        ({entries.length} so far)
                                    </span>
                                )}
                            </button>

                            {/* Submit */}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}
                            >
                                {loading
                                    ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Registering…</>
                                    : `✓ Register ${entries.length} Asset${entries.length > 1 ? 's' : ''}`
                                }
                            </button>
                        </div>

                        {/* ── RIGHT COLUMN — sidebar info ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Entry counter */}
                            <div className="premium-card" style={{
                                background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{entries.length}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    asset{entries.length !== 1 ? 's' : ''} in this batch
                                </div>
                                {assetType && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <span style={{
                                            background: typeBadge.bg, color: typeBadge.color,
                                            border: `1px solid ${typeBadge.color}40`,
                                            borderRadius: 20, padding: '0.25rem 0.75rem',
                                            fontSize: '0.75rem', fontWeight: 700,
                                        }}>{typeBadge.label}</span>
                                    </div>
                                )}
                            </div>

                            {/* How it works */}
                            <div className="premium-card" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                <div className="section-title" style={{ color: 'var(--accent)', marginBottom: '0.875rem' }}>💡 How Batch Add Works</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {[
                                        'Fill the "Common Details" once for the whole batch.',
                                        'Each entry below gets its own Serial Number, Warranty, and Photos.',
                                        'Click "Add Another Asset" to add more units of the same model.',
                                        'All entries are registered in a single submission.',
                                        'Use "✏️ Edit" to change common fields (resets entries).',
                                    ].map((tip, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                            <span>{tip}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Warranty alert */}
                            <div className="premium-card" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <div className="section-title" style={{ color: 'var(--warning)', marginBottom: '0.875rem' }}>⚡ Warranty Alert</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Always record warranty expiry dates. Near-expiry alerts appear in the Inventory page for assets expiring within 30 days.
                                </div>
                            </div>

                        </div>

                    </div>
                </form>
            )}
        </div>
    );
}
