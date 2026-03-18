import { useState, useEffect, useCallback, useRef } from 'react';
import { purchaseOrdersAPI, assetRequestsAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

/* ──────────────────────────────────────────────
   Status meta
────────────────────────────────────────────── */
const STATUS_META = {
    pending_purchase: { label: 'Pending Purchase', color: '#a855f7', bg: '#a855f715', icon: '🕐' },
    ordered: { label: 'Ordered', color: '#f59e0b', bg: '#f59e0b15', icon: '📦' },
    received: { label: 'Received', color: '#10b981', bg: '#10b98115', icon: '✅' },
};

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ──────────────────────────────────────────────
   Create Purchase Order Modal
────────────────────────────────────────────── */
function CreatePOModal({ onClose, onSuccess, prefill }) {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [form, setForm] = useState({
        assetCategory: prefill?.assetCategory || '',
        assetDescription: prefill?.assetDescription || '',
        quantity: 1,
        vendor: '',
        estimatedCost: '',
        notes: '',
        linkedAssetRequest: prefill?._id || '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        assetRequestsAPI.getAll({ status: 'pending_store' })
            .then(res => setPendingRequests(res.data.data.requests))
            .catch(() => { });
    }, []);

    const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    // When a linked request is selected, auto-fill category/description
    const handleLinkedChange = (e) => {
        const id = e.target.value;
        const req = pendingRequests.find(r => r._id === id);
        setForm(f => ({
            ...f,
            linkedAssetRequest: id,
            assetCategory: req?.assetCategory || f.assetCategory,
            assetDescription: req?.assetDescription || f.assetDescription,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await purchaseOrdersAPI.create({
                ...form,
                quantity: Number(form.quantity) || 1,
                estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
                linkedAssetRequest: form.linkedAssetRequest || undefined,
            });
            toast.success('Purchase order created!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create PO');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 560, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3>New Purchase Order</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Create a procurement request for an asset not in stock</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <form id="createPOForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Link to existing asset request */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Link to Asset Request (optional)</label>
                            <select className="form-select" value={form.linkedAssetRequest} onChange={handleLinkedChange}>
                                <option value="">— Not linked to a request —</option>
                                {pendingRequests.map(r => (
                                    <option key={r._id} value={r._id}>
                                        {r.requestedBy?.name} — {r.assetCategory} ({fmt(r.createdAt)})
                                    </option>
                                ))}
                            </select>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Linking will update the employee's request status to "Purchase Requested"
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Asset Category *</label>
                                <input className="form-input" value={form.assetCategory} onChange={set('assetCategory')} required placeholder="e.g. Laptop, Projector" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Quantity</label>
                                <input className="form-input" type="number" min={1} value={form.quantity} onChange={set('quantity')} />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Description *</label>
                            <textarea className="form-input" rows={2} value={form.assetDescription} onChange={set('assetDescription')} required placeholder="Describe the asset specifications or requirements…" style={{ resize: 'vertical' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Vendor (optional)</label>
                                <input className="form-input" value={form.vendor} onChange={set('vendor')} placeholder="Vendor name" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Estimated Cost (₹)</label>
                                <input className="form-input" type="number" min={0} value={form.estimatedCost} onChange={set('estimatedCost')} placeholder="0" />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Notes (optional)</label>
                            <textarea className="form-input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any additional notes about this purchase…" style={{ resize: 'vertical' }} />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="createPOForm" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Creating…' : '🛒 Create Purchase Order'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   Place Order Modal (pending_purchase → ordered)
────────────────────────────────────────────── */
function PlaceOrderModal({ po, onClose, onSuccess }) {
    const [form, setForm] = useState({ vendor: po.vendor || '', orderDate: '', note: '' });
    const [submitting, setSubmitting] = useState(false);
    const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await purchaseOrdersAPI.updateStatus(po._id, {
                vendor: form.vendor,
                orderDate: form.orderDate || undefined,
                note: form.note || `Order placed with ${form.vendor || 'vendor'}`,
            });
            toast.success('Order placed successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 420, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3>Place Order</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Confirm that the order has been placed with the vendor and set the status to <strong>Ordered</strong>.
                    </p>
                    <form id="placeOrderForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Vendor *</label>
                            <input className="form-input" value={form.vendor} onChange={set('vendor')} required placeholder="Vendor name" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Order Date</label>
                            <input className="form-input" type="date" value={form.orderDate} onChange={set('orderDate')} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Note (optional)</label>
                            <textarea className="form-input" rows={2} value={form.note} onChange={set('note')} placeholder="e.g. Order #12345, expected delivery in 7 days…" style={{ resize: 'vertical' }} />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="placeOrderForm" className="btn btn-warning" disabled={submitting}>
                        {submitting ? 'Saving…' : '📦 Confirm Order Placed'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   Mark Received Modal (ordered → received)
────────────────────────────────────────────── */
function MarkReceivedModal({ po, onClose, onSuccess }) {
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await purchaseOrdersAPI.updateStatus(po._id, { note: note || 'Asset received' });
            toast.success('Marked as received!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: 380, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h3>Mark as Received</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Confirm that <strong>{po.assetCategory}</strong> has physically arrived. You can add it to inventory next.
                    </p>
                    <form id="receivedForm" onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Delivery Note (optional)</label>
                            <textarea className="form-input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Received 1 unit in good condition…" style={{ resize: 'vertical' }} />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" form="receivedForm" className="btn btn-success" disabled={submitting}>
                        {submitting ? 'Saving…' : '✅ Confirm Received'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   Add to Inventory Modal — Bulk Serial Entry Wizard
────────────────────────────────────────────── */
function AddToInventoryModal({ po, onClose, onSuccess }) {
    const qty = po.quantity || 1;
    const hasLinkedEmployee = !!(po.linkedAssetRequest?.requestedBy);

    // ── Shared asset details ──
    const [shared, setShared] = useState({
        name: po.assetCategory || '',
        category: po.assetCategory || '',
        condition: 'new',
        vendor: po.vendor || '',
        purchasePrice: po.estimatedCost || '',
        assetType: 'movable',
        location: '',
        notes: po.notes || '',
        autoAssign: hasLinkedEmployee && qty === 1,
    });

    // ── Serials: one entry per unit ──
    const [serials, setSerials] = useState(() => Array.from({ length: qty }, () => ({ value: '', status: 'idle' })));
    const inputRefs = useRef([]);

    // ── Step: 'details' | 'serials' ──
    const [step, setStep] = useState('details');
    const [submitting, setSubmitting] = useState(false);
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');

    const setS = (f) => (e) => setShared(p => ({
        ...p,
        [f]: e.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

    // ── Serial helpers ──
    const allValues = serials.map(s => s.value.trim());

    const getStatus = (idx, val) => {
        const v = val.trim();
        if (!v) return 'idle';
        const dupeIdx = allValues.findIndex((x, i) => i !== idx && x === v && x !== '');
        if (dupeIdx !== -1) return 'duplicate';
        return 'ok';
    };

    const updateSerial = (idx, val) => {
        setSerials(prev => prev.map((s, i) => i === idx
            ? { value: val, status: getStatus(idx, val) }
            : { ...s, status: getStatus(i, s.value) }
        ));
    };

    // Auto-advance to next input when Enter or Tab pressed (barcode scanner fires Enter)
    const handleKeyDown = (idx, e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const next = inputRefs.current[idx + 1];
            if (next) next.focus();
        }
    };

    // After scanner fires and focus moves naturally, auto-advance from filled rows
    const handleBlur = (idx) => {
        const v = serials[idx].value.trim();
        if (v && idx < qty - 1) {
            setTimeout(() => {
                // Only auto-advance if next one is still empty
                if (!serials[idx + 1]?.value.trim()) {
                    inputRefs.current[idx + 1]?.focus();
                }
            }, 80);
        }
    };

    // ── Paste-all shortcut ──
    const applyPaste = () => {
        const lines = pasteText.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
        setSerials(prev => prev.map((s, i) => {
            const val = lines[i] || s.value;
            return { value: val, status: getStatus(i, val) };
        }));
        setPasteOpen(false);
        setPasteText('');
    };

    const filled = serials.filter(s => s.value.trim()).length;
    const hasDuplicates = serials.some(s => s.status === 'duplicate');
    const allFilled = filled === qty;
    const canSubmit = allFilled && !hasDuplicates;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            if (qty === 1) {
                // Single asset — existing single-asset endpoint
                await purchaseOrdersAPI.receiveAndAdd(po._id, {
                    ...shared,
                    serialNumber: serials[0].value.trim(),
                    purchasePrice: shared.purchasePrice ? Number(shared.purchasePrice) : undefined,
                    autoAssign: shared.autoAssign,
                });
                toast.success(shared.autoAssign && hasLinkedEmployee
                    ? 'Asset added and auto-assigned!'
                    : 'Asset added to inventory!');
            } else {
                // Bulk — send ALL serial numbers in ONE request to the new bulk endpoint
                const assetPayloads = serials.map(s => ({
                    ...shared,
                    serialNumber: s.value.trim(),
                    purchasePrice: shared.purchasePrice ? Number(shared.purchasePrice) : undefined,
                    autoAssign: false,
                }));
                const res = await purchaseOrdersAPI.bulkReceive(po._id, assetPayloads);
                const { created, skipped, skippedSerials } = res.data.data;
                if (skipped === 0) {
                    toast.success(`✅ All ${created} assets added to inventory!`);
                } else {
                    toast(`⚠ ${created} added, ${skipped} skipped (already in DB): ${skippedSerials.join(', ')}`, { duration: 6000 });
                }
            }
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add assets');
        } finally {
            setSubmitting(false);
        }
    };


    // Focus first serial input when step changes to 'serials'
    useEffect(() => {
        if (step === 'serials') {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    // ── Step 1: Shared Details ──
    const detailsForm = (
        <form id="addInventoryForm" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onSubmit={e => { e.preventDefault(); qty > 1 ? setStep('serials') : null; }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Asset Name *</label>
                    <input className="form-input" value={shared.name} onChange={setS('name')} required placeholder="e.g. Samsung Galaxy Tab S9" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Category *</label>
                    <input className="form-input" value={shared.category} onChange={setS('category')} required placeholder="e.g. Tablet" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Condition *</label>
                    <select className="form-select" value={shared.condition} onChange={setS('condition')}>
                        <option value="new">New</option>
                        <option value="good">Good</option>
                        <option value="minor_damage">Minor Damage</option>
                        <option value="major_damage">Major Damage</option>
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Asset Type</label>
                    <select className="form-select" value={shared.assetType} onChange={setS('assetType')}>
                        <option value="movable">Movable</option>
                        <option value="fixed">Fixed</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Vendor</label>
                    <input className="form-input" value={shared.vendor} onChange={setS('vendor')} placeholder="Vendor name" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Purchase Price (₹) per unit</label>
                    <input className="form-input" type="number" min={0} value={shared.purchasePrice} onChange={setS('purchasePrice')} placeholder="0" />
                </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Storage Location</label>
                <input className="form-input" value={shared.location} onChange={setS('location')} placeholder="e.g. Store Room A, Shelf 3" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows={2} value={shared.notes} onChange={setS('notes')} style={{ resize: 'vertical' }} />
            </div>

            {/* Single-unit serial (only rendered here when qty === 1) */}
            {qty === 1 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Serial Number *</label>
                    <input
                        ref={el => inputRefs.current[0] = el}
                        className="form-input"
                        value={serials[0].value}
                        onChange={e => updateSerial(0, e.target.value)}
                        required
                        placeholder="Scan or type serial number"
                        style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
                    />
                </div>
            )}

            {hasLinkedEmployee && qty === 1 && (
                <div style={{
                    background: 'rgba(99,102,241,0.07)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.875rem 1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <input id="autoAssign" type="checkbox" checked={shared.autoAssign} onChange={setS('autoAssign')}
                            style={{ marginTop: 2, width: 16, height: 16, accentColor: '#6366f1', flexShrink: 0 }} />
                        <label htmlFor="autoAssign" style={{ cursor: 'pointer' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#6366f1' }}>Auto-assign to requesting employee</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                Directly issue to <strong>{po.linkedAssetRequest?.requestedBy?.name}</strong> and mark their request as fulfilled
                            </div>
                        </label>
                    </div>
                </div>
            )}
        </form>
    );

    // ── Step 2: Serial Capture Panel ──
    const serialPanel = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Scanner mode instruction banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 1rem',
                background: 'rgba(99,102,241,0.06)',
                border: '1px dashed rgba(99,102,241,0.35)',
                borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
            }}>
                <span style={{ fontSize: '1.4rem' }}>📷</span>
                <div>
                    <div style={{ fontWeight: 700, color: '#4f46e5', marginBottom: 2 }}>Scanner Ready</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        Point your barcode scanner at each unit — serial fills and <strong>jumps to next</strong> automatically.
                        Or type manually and press <kbd style={{
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '1px 5px', fontSize: '0.72rem', fontFamily: 'monospace',
                        }}>Enter</kbd> to advance.
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Serial Numbers Captured
                    </span>
                    <span style={{
                        fontSize: '0.75rem', fontWeight: 800,
                        color: canSubmit ? '#059669' : '#6366f1',
                        background: canSubmit ? 'rgba(5,150,105,0.08)' : 'rgba(99,102,241,0.08)',
                        padding: '2px 10px', borderRadius: 999,
                    }}>
                        {filled} / {qty} {hasDuplicates ? '· ⚠ Duplicate detected' : canSubmit ? '· ✓ Ready' : ''}
                    </span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', borderRadius: 999,
                        background: hasDuplicates ? '#f59e0b' : '#6366f1',
                        width: `${(filled / qty) * 100}%`,
                        transition: 'width 0.25s ease',
                    }} />
                </div>
            </div>

            {/* Paste shortcut */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={() => setPasteOpen(v => !v)}
                    style={{
                        fontSize: '0.76rem', fontWeight: 600,
                        color: '#6366f1', background: 'rgba(99,102,241,0.07)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 6, padding: '0.3rem 0.7rem',
                        cursor: 'pointer',
                    }}
                >
                    📋 Paste All Serials at Once
                </button>
            </div>

            {pasteOpen && (
                <div style={{
                    padding: '0.875rem', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)',
                }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Paste {qty} serial numbers — one per line (or comma/semicolon separated):
                    </div>
                    <textarea
                        className="form-input"
                        rows={4}
                        autoFocus
                        placeholder={`SN001\nSN002\nSN003\n…`}
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        style={{ fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setPasteOpen(false)}
                            style={{ fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            Cancel
                        </button>
                        <button type="button" onClick={applyPaste}
                            className="btn btn-primary btn-sm">
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {/* Serial input rows */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                maxHeight: 320, overflowY: 'auto',
                paddingRight: 4,
            }}>
                {serials.map((s, idx) => {
                    const isDupe = s.status === 'duplicate';
                    const isOk = s.status === 'ok';
                    return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {/* Row number badge */}
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 800,
                                background: isOk ? 'rgba(5,150,105,0.1)' : isDupe ? 'rgba(245,158,11,0.12)' : 'var(--bg-secondary)',
                                color: isOk ? '#059669' : isDupe ? '#d97706' : 'var(--text-muted)',
                                border: `1px solid ${isOk ? 'rgba(5,150,105,0.3)' : isDupe ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                                transition: 'all 0.15s',
                            }}>
                                {isOk ? '✓' : idx + 1}
                            </div>

                            {/* Serial input */}
                            <input
                                ref={el => inputRefs.current[idx] = el}
                                className="form-input"
                                id={`serial-input-${idx}`}
                                value={s.value}
                                onChange={e => updateSerial(idx, e.target.value)}
                                onKeyDown={e => handleKeyDown(idx, e)}
                                onBlur={() => handleBlur(idx)}
                                placeholder={`Unit ${idx + 1} serial number`}
                                autoComplete="off"
                                spellCheck={false}
                                style={{
                                    flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em',
                                    fontSize: '0.875rem',
                                    borderColor: isDupe ? '#f59e0b' : isOk ? '#10b981' : undefined,
                                    boxShadow: isDupe
                                        ? '0 0 0 3px rgba(245,158,11,0.15)'
                                        : isOk ? '0 0 0 3px rgba(16,185,129,0.12)'
                                            : undefined,
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                }}
                            />

                            {/* Status indicator */}
                            <div style={{ width: 20, textAlign: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                                {isOk && <span style={{ color: '#10b981' }}>✓</span>}
                                {isDupe && <span style={{ color: '#f59e0b' }} title="Duplicate serial">⚠</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasDuplicates && (
                <div style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#92400e',
                }}>
                    ⚠ Some serial numbers are duplicated. Each unit must have a unique serial.
                </div>
            )}
        </div>
    );

    return (
        <div className="glass-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="premium-card" style={{ maxWidth: qty > 1 ? 640 : 600, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3>Add to Inventory</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            {qty > 1 && (
                                <>
                                    {/* Step breadcrumb */}
                                    <span style={{
                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                                        borderRadius: 999,
                                        background: step === 'details' ? '#6366f1' : 'var(--bg-secondary)',
                                        color: step === 'details' ? '#fff' : 'var(--text-muted)',
                                    }}>1 Details</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>→</span>
                                    <span style={{
                                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                                        borderRadius: 999,
                                        background: step === 'serials' ? '#6366f1' : 'var(--bg-secondary)',
                                        color: step === 'serials' ? '#fff' : 'var(--text-muted)',
                                    }}>2 Serial Numbers ({qty} units)</span>
                                </>
                            )}
                            {qty === 1 && (
                                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                    {po.assetCategory} · {po.vendor || 'No vendor'}
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {step === 'details' ? detailsForm : serialPanel}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    {step === 'serials' && qty > 1 ? (
                        <>
                            <button type="button" className="btn btn-ghost" onClick={() => setStep('details')}>
                                ← Back
                            </button>
                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={submitting || !canSubmit}
                                onClick={handleSubmit}
                                title={hasDuplicates ? 'Fix duplicate serials first' : !allFilled ? `${qty - filled} serial(s) still empty` : ''}
                            >
                                {submitting
                                    ? `Adding ${qty} Assets…`
                                    : `📦 Add ${qty} Assets to Inventory`}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                            {qty > 1 ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!shared.name || !shared.category}
                                    onClick={() => setStep('serials')}
                                >
                                    Next: Enter Serials →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    disabled={submitting || !shared.name || !shared.category || !serials[0].value.trim()}
                                    onClick={handleSubmit}
                                >
                                    {submitting ? 'Adding…' : '📦 Add to Inventory'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


/* ──────────────────────────────────────────────
   Timeline Drawer
────────────────────────────────────────────── */
function TimelineDrawer({ po, onClose }) {
    return (
        <div className="glass-modal-overlay" onClick={onClose}>
            <div className="premium-card" style={{ maxWidth: 440, width: '95vw', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h3>Purchase History</h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{po.assetCategory} · qty {po.quantity}</span>
                    </div>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {po.timeline.map((entry, i) => {
                            const meta = STATUS_META[entry.status] || { icon: '•', color: 'var(--text-muted)' };
                            const isLast = i === po.timeline.length - 1;
                            return (
                                <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: isLast ? 0 : '1.25rem', position: 'relative' }}>
                                    {/* Connector line */}
                                    {!isLast && (
                                        <div style={{ position: 'absolute', left: 15, top: 28, width: 2, height: 'calc(100% - 28px)', background: 'var(--border)' }} />
                                    )}
                                    {/* Status dot */}
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: meta.bg || '#f3f4f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.9rem', zIndex: 1,
                                    }}>
                                        {meta.icon || '•'}
                                    </div>
                                    <div style={{ paddingTop: '0.35rem' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: meta.color || 'var(--text)' }}>
                                            {meta.label || entry.status}
                                        </div>
                                        {entry.note && (
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                                {entry.note}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                            {entry.by?.name && <span>{entry.by.name} · </span>}
                                            {new Date(entry.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   Main Page
────────────────────────────────────────────── */
export default function PurchaseManagement() {
    const [orders, setOrders] = useState([]);
    const [counts, setCounts] = useState({ pending_purchase: 0, ordered: 0, received: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState(''); // '' = all
    const [createModal, setCreateModal] = useState(false);
    const [placeOrderModal, setPlaceOrderModal] = useState(null);
    const [markReceivedModal, setMarkReceivedModal] = useState(null);
    const [addInventoryModal, setAddInventoryModal] = useState(null);
    const [timelineModal, setTimelineModal] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, countsRes] = await Promise.all([
                purchaseOrdersAPI.getAll(statusFilter ? { status: statusFilter } : {}),
                purchaseOrdersAPI.getCounts(),
            ]);
            setOrders(ordersRes.data.data.purchaseOrders);
            setCounts(countsRes.data.data.counts);
        } catch {
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const statCards = [
        { key: '', label: 'All Orders', value: counts.total, color: '#6366f1', bg: '#6366f115', icon: '🗂️' },
        { key: 'pending_purchase', label: 'Pending Purchase', value: counts.pending_purchase, color: '#a855f7', bg: '#a855f715', icon: '🕐' },
        { key: 'ordered', label: 'Ordered', value: counts.ordered, color: '#f59e0b', bg: '#f59e0b15', icon: '📦' },
        { key: 'received', label: 'Received', value: counts.received, color: '#10b981', bg: '#10b98115', icon: '✅' },
    ];

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Purchase Management</h1>
                    <p>Track and manage asset procurement from request to inventory</p>
                </div>
                <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
                    + New Purchase Order
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
                {statCards.map(card => (
                    <button
                        key={card.key}
                        className="glass-panel stat-card"
                        onClick={() => setStatusFilter(card.key)}
                        style={{
                            background: statusFilter === card.key ? card.bg : undefined,
                            borderColor: statusFilter === card.key ? card.color : undefined,
                            boxShadow: statusFilter === card.key ? `0 0 0 1px ${card.color}` : undefined,
                            padding: '1rem 1.1rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>{card.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.25rem' }}>{card.label}</div>
                    </button>
                ))}
            </div>

            {/* ── Lifecycle Steps Visual ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0', marginBottom: '1.5rem',
                padding: '0.75rem 1.25rem', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: '0.78rem', fontWeight: 600, overflowX: 'auto',
            }}>
                {[
                    { icon: '🛒', label: 'Create PO', color: '#6366f1' },
                    { arrow: true },
                    { icon: '🕐', label: 'Pending', color: '#a855f7' },
                    { arrow: true },
                    { icon: '📦', label: 'Ordered', color: '#f59e0b' },
                    { arrow: true },
                    { icon: '✅', label: 'Received', color: '#10b981' },
                    { arrow: true },
                    { icon: '🏷️', label: 'Add to Inventory', color: '#10b981' },
                    { arrow: true },
                    { icon: '👤', label: 'Auto-Assign (optional)', color: '#6366f1' },
                ].map((step, i) =>
                    step.arrow
                        ? <span key={i} style={{ color: 'var(--border)', padding: '0 0.5rem', fontSize: '1rem' }}>→</span>
                        : (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                                <span>{step.icon}</span>
                                <span style={{ color: step.color }}>{step.label}</span>
                            </div>
                        )
                )}
            </div>

            {/* ── Active Filter Label ── */}
            {statusFilter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Showing: <strong>{STATUS_META[statusFilter]?.label}</strong>
                    </span>
                    <button
                        onClick={() => setStatusFilter('')}
                        style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                        × Clear filter
                    </button>
                </div>
            )}

            {/* ── Orders Table / Empty State ── */}
            {loading ? (
                <div className="loading"><div className="spinner" /></div>
            ) : orders.length === 0 ? (
                <div className="premium-card">
                    <div className="empty-state">
                        <div className="empty-icon">🛒</div>
                        <h3>No purchase orders</h3>
                        <p>{statusFilter ? `No orders with status "${STATUS_META[statusFilter]?.label}"` : 'Create a Purchase Order when an asset is out of stock'}</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setCreateModal(true)}>
                            + New Purchase Order
                        </button>
                    </div>
                </div>
            ) : (
                <div className="premium-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Vendor</th>
                                <th>Linked Request</th>
                                <th>Status</th>
                                <th>Order Date</th>
                                <th>Received</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(po => {
                                const meta = STATUS_META[po.purchaseStatus];
                                // Bulk PO: fully added when linkedAssets.length >= quantity
                                const linkedCount = po.linkedAssets?.length || 0;
                                const isBulk = po.quantity > 1;
                                const hasLinkedAsset = isBulk
                                    ? linkedCount >= po.quantity
                                    : !!po.linkedAsset;
                                const partiallyAdded = isBulk && linkedCount > 0 && linkedCount < po.quantity;
                                return (
                                    <tr key={po._id}>
                                        {/* Asset Category */}
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{po.assetCategory}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {po.assetDescription}
                                            </div>
                                            {po.quantity > 1 && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', background: '#6366f115', padding: '1px 6px', borderRadius: 999 }}>
                                                    ×{po.quantity}
                                                </span>
                                            )}
                                            {po.estimatedCost && (
                                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    Est. ₹{Number(po.estimatedCost).toLocaleString('en-IN')}
                                                </div>
                                            )}
                                        </td>

                                        {/* Vendor */}
                                        <td style={{ fontSize: '0.84rem', fontWeight: 500 }}>
                                            {po.vendor || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>

                                        {/* Linked Request */}
                                        <td>
                                            {po.linkedAssetRequest ? (
                                                <div style={{ fontSize: '0.78rem' }}>
                                                    <div style={{ fontWeight: 600 }}>{po.linkedAssetRequest.requestedBy?.name || '—'}</div>
                                                    <div style={{ color: 'var(--text-muted)' }}>{po.linkedAssetRequest.assetCategory}</div>
                                                    <StatusBadge status={po.linkedAssetRequest.status} />
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standalone PO</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td>
                                            <span style={{
                                                fontSize: '0.73rem', fontWeight: 700, padding: '3px 10px',
                                                borderRadius: 999, background: meta?.bg, color: meta?.color,
                                            }}>
                                                {meta?.icon} {meta?.label}
                                            </span>
                                            {hasLinkedAsset && (
                                                <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                                                    ✓ {isBulk ? `${linkedCount}/${po.quantity} In Inventory` : 'In Inventory'}
                                                </div>
                                            )}
                                            {partiallyAdded && (
                                                <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                                                    ⚠ {linkedCount}/{po.quantity} added
                                                </div>
                                            )}
                                        </td>

                                        {/* Order Date */}
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {fmt(po.orderDate)}
                                        </td>

                                        {/* Received Date */}
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {fmt(po.receivedDate)}
                                        </td>

                                        {/* Actions */}
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {/* Timeline */}
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    title="View timeline"
                                                    onClick={() => setTimelineModal(po)}
                                                >
                                                    🕐
                                                </button>

                                                {/* Advance: pending → ordered */}
                                                {po.purchaseStatus === 'pending_purchase' && (
                                                    <button className="btn btn-warning btn-sm" onClick={() => setPlaceOrderModal(po)}>
                                                        📦 Place Order
                                                    </button>
                                                )}

                                                {/* Advance: ordered → received */}
                                                {po.purchaseStatus === 'ordered' && (
                                                    <button className="btn btn-success btn-sm" onClick={() => setMarkReceivedModal(po)}>
                                                        ✅ Mark Received
                                                    </button>
                                                )}

                                                {/* Add to inventory (only if received + not yet linked) */}
                                                {po.purchaseStatus === 'received' && !hasLinkedAsset && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => setAddInventoryModal(po)}>
                                                        🏷️ Add to Inventory
                                                    </button>
                                                )}

                                                {/* Asset already added */}
                                                {hasLinkedAsset && (
                                                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                                                        ✓ {po.linkedAsset?.name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Modals ── */}
            {createModal && (
                <CreatePOModal onClose={() => setCreateModal(false)} onSuccess={fetchData} />
            )}
            {placeOrderModal && (
                <PlaceOrderModal po={placeOrderModal} onClose={() => setPlaceOrderModal(null)} onSuccess={fetchData} />
            )}
            {markReceivedModal && (
                <MarkReceivedModal po={markReceivedModal} onClose={() => setMarkReceivedModal(null)} onSuccess={fetchData} />
            )}
            {addInventoryModal && (
                <AddToInventoryModal po={addInventoryModal} onClose={() => setAddInventoryModal(null)} onSuccess={fetchData} />
            )}
            {timelineModal && (
                <TimelineDrawer po={timelineModal} onClose={() => setTimelineModal(null)} />
            )}
        </div>
    );
}
