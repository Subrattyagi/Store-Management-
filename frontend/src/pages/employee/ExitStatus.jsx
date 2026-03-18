import { useState, useEffect } from 'react';
import { exitClearanceAPI, assignmentsAPI } from '../../api';
import toast from 'react-hot-toast';

const STEPS = [
    { key: 'assets', label: 'Assets Returned', subtitle: 'All issued assets must be returned or accounted for' },
    { key: 'manager', label: 'Manager Approval', subtitle: 'Your manager must sign off on the exit' },
    { key: 'director', label: 'Director Review', subtitle: 'Final approval from HR / Director level' },
    { key: 'cleared', label: 'Exit Cleared', subtitle: 'All clearances completed — you are free to go!' },
];

function StepIcon({ status }) {
    if (status === 'cleared') return <span>✓</span>;
    if (status === 'blocked') return <span>✕</span>;
    if (status === 'pending') return <span>⋯</span>;
    return <span>○</span>;
}

export default function ExitStatus() {
    const [clearance, setClearance] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resClearance, resAssignments] = await Promise.all([
                    exitClearanceAPI.getMe(),
                    assignmentsAPI.getAll()
                ]);
                
                const fetchedClearance = resClearance.data.data.clearance;
                setClearance(fetchedClearance);

                if (fetchedClearance) {
                    // Only show assets that were active when the clearance started OR are still active
                    const clearanceDate = new Date(fetchedClearance.createdAt);
                    
                    const relevantAssets = resAssignments.data.data.assignments.filter(a => {
                        // Include anything currently issued or return_requested
                        if (['issued', 'return_requested'].includes(a.status)) return true;
                        
                        // If it was returned, but it was returned AFTER the clearance started, it's relevant to show as "Returned" for the checklist
                        if (a.status === 'returned' && new Date(a.updatedAt) >= clearanceDate) return true;

                        return false;
                    });
                    
                    setAssignments(relevantAssets);
                }

            } catch {
                toast.error('Failed to load exit clearance data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Exit Clearance Status</h1>
                    <p>Track your offboarding and asset clearance progress</p>
                </div>
                {clearance && <StatusBadge status={clearance.status} />}
            </div>

            {!clearance ? (
                <div className="premium-card" style={{ maxWidth: 560, padding: '3rem 2rem', textAlign: 'center', margin: '0 auto', background: 'var(--surface)', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: 'var(--shadow-md)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.5rem', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>✅</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>No active exit process</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>You don't have any active exit clearance procedures. Keep up the great work!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '1.5rem', alignItems: 'start' }}>
                    {/* Timeline */}
                    <div className="premium-card" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>Clearance Progress</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your step-by-step exit process</div>
                        </div>
                        <div className="clearance-timeline">
                            {STEPS.map((step, idx) => {
                                const isLast = idx === STEPS.length - 1;
                                const stepStatus = clearance.status === 'cleared' ? 'cleared'
                                    : idx === 0 && clearance.status === 'blocked' ? 'blocked'
                                        : idx === 0 ? 'cleared'
                                            : clearance.status === 'pending' && idx === 1 ? 'pending'
                                                : 'waiting';

                                return (
                                    <div key={step.key} className="clearance-step" style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: isLast ? 0 : '2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                                                background: stepStatus === 'cleared' ? '#10b981' : stepStatus === 'blocked' ? '#ef4444' : stepStatus === 'pending' ? '#6366f1' : 'var(--bg-secondary)',
                                                color: stepStatus === 'waiting' ? 'var(--text-muted)' : '#ffffff',
                                                border: stepStatus === 'waiting' ? '2px solid var(--border)' : 'none',
                                                boxShadow: stepStatus === 'cleared' ? '0 0 12px rgba(16,185,129,0.4)' : stepStatus === 'pending' ? '0 0 12px rgba(99,102,241,0.4)' : 'none'
                                            }}>
                                                <StepIcon status={stepStatus} />
                                            </div>
                                            {!isLast && <div style={{ position: 'absolute', top: 32, bottom: 0, left: 16, width: 2, background: stepStatus === 'cleared' ? '#10b981' : 'var(--border)', transform: 'translateX(-50%)' }} />}
                                        </div>
                                        <div style={{ paddingTop: '0.25rem' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: 700, color: stepStatus === 'waiting' ? 'var(--text-secondary)' : 'var(--text)' }}>{step.label}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{step.subtitle}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info card */}
                    <div className="premium-card" style={{ padding: '1.5rem', background: 'linear-gradient(180deg, var(--surface) 0%, rgba(248, 250, 252, 0.5) 100%)' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>Clearance Details</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                ['Status', <StatusBadge status={clearance.status} />],
                                ['Initiated', new Date(clearance.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })],
                                ['Last Updated', new Date(clearance.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })],
                                clearance.approvedBy && ['Approved By', clearance.approvedBy.name],
                            ].filter(Boolean).map(([label, value]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {clearance.remarks && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.5)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Remarks</div>
                                {clearance.remarks}
                            </div>
                        )}

                        {clearance.status === 'blocked' && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#b91c1c', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '1rem' }}>⚠️</span>
                                <div>
                                    <strong>Clearance blocked.</strong> You may have unreturned assets. Go to My Assets to request returns.
                                </div>
                            </div>
                        )}
                        {clearance.status === 'cleared' && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius)', color: '#047857', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.25rem' }}>🎉</span>
                                <div>
                                    <strong>Fully cleared!</strong> Thank you for your service.
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Assigned Assets Tracking List */}
                    <div className="premium-card" style={{ padding: '0', overflow: 'hidden', marginTop: '1.5rem', gridColumn: '2 / -1' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>Assigned Assets</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'rgba(212, 175, 55, 0.15)', color: '#b48a00', padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                                Required Return
                            </span>
                        </div>
                        
                        {assignments.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📦</div>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text)' }}>No active assets</div>
                                <div style={{ fontSize: '0.85rem' }}>You have no assets linked to this clearance checklist.</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {assignments.map((item, idx) => {
                                    const isReturned = item.status === 'returned';
                                    const isRequested = item.status === 'return_requested';
                                    const isIssued = item.status === 'issued';
                                    
                                    return (
                                        <div key={item._id} style={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                            padding: '1.25rem 1.5rem', 
                                            borderBottom: idx !== assignments.length - 1 ? '1px solid var(--border)' : 'none',
                                            background: isReturned ? '#f8fafc' : 'transparent',
                                            transition: 'background 0.2s ease'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ 
                                                    width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                    background: isReturned ? '#ecfdf5' : isRequested ? '#eff6ff' : '#fef2f2',
                                                    color: isReturned ? '#10b981' : isRequested ? '#3b82f6' : '#ef4444',
                                                    border: `1px solid ${isReturned ? '#a7f3d0' : isRequested ? '#bfdbfe' : '#fecaca'}`
                                                }}>
                                                    {isReturned ? '✓' : isRequested ? '⇄' : '⋯'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: isReturned ? 'var(--text-secondary)' : 'var(--text)', fontSize: '0.95rem', textDecoration: isReturned ? 'line-through' : 'none' }}>
                                                        {item.asset?.name || 'Unknown Asset'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{ fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            {item.asset?.serialNumber}
                                                        </span>
                                                        <span>•</span>
                                                        <span>{item.asset?.category}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                                {isReturned && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span> Returned
                                                    </span>
                                                )}
                                                {isRequested && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}></span> Awaiting Verification
                                                    </span>
                                                )}
                                                {isIssued && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulseRed 2s infinite' }}></span> Pending Return
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
