import { useState, useEffect } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#a855f7', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.625rem 0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{payload[0].value} assets</div>
        </div>
    );
};

export default function Reports() {
    const [departmentData, setDepartmentData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [deptRes, sumRes] = await Promise.all([reportsAPI.getDepartment(), reportsAPI.getSummary()]);
                setDepartmentData(deptRes.data.data.report.map(d => ({
                    department: d._id || 'Unassigned',
                    total: d.totalAssets,
                    employees: d.employees
                })));
                setSummary(sumRes.data.data);
            } catch {
                toast.error('Failed to load reports');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Organization Reports</h1>
                    <p>Department-wise asset distribution and summary analytics</p>
                </div>
            </div>

            {/* Quick Stats */}
            {summary && (
                <div className="stat-grid">
                    <div className="stat-card accent">
                        <div className="stat-icon accent">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                        </div>
                        <div><div className="stat-value">{summary.totalAssets}</div><div className="stat-label">Total Assets</div></div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon success">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                        </div>
                        <div><div className="stat-value">{summary.totalUsers}</div><div className="stat-label">Total Users</div></div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-icon warning">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                        </div>
                        <div><div className="stat-value">{departmentData.length}</div><div className="stat-label">Departments</div></div>
                    </div>
                    <div className="stat-card info">
                        <div className="stat-icon info">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        </div>
                        <div><div className="stat-value">{summary.byStatus?.issued || 0}</div><div className="stat-label">Assets Issued</div></div>
                    </div>
                </div>
            )}

            {/* Bar Chart */}
            <div className="chart-card" style={{ marginBottom: '1.25rem' }}>
                <div className="section-header">
                    <div>
                        <div className="section-title">Assets by Department</div>
                        <div className="section-subtitle">Total asset count per department</div>
                    </div>
                </div>
                {departmentData.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📊</span><h3>No data yet</h3></div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                            <Bar dataKey="total" name="Assets" radius={[6, 6, 0, 0]}>
                                {departmentData.map((_, i) => (
                                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Detail Table */}
            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Total Assets</th>
                            <th>Assigned Items</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departmentData.length === 0 ? (
                            <tr><td colSpan="3"><div className="empty-state"><span className="empty-icon">📦</span><h3>No data available</h3></div></td></tr>
                        ) : departmentData.map((dept, idx) => (
                            <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{dept.department}</td>
                                <td>
                                    <span className="badge badge-issued">
                                        <span className="badge-dot" />
                                        {dept.total} items
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {dept.employees.slice(0, 3).map((emp, i) => (
                                            <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ fontWeight: 600 }}>{emp.employeeName}</span>
                                                <span style={{ color: 'var(--text-muted)' }}> — {emp.assetName} </span>
                                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>({emp.serialNumber})</span>
                                            </div>
                                        ))}
                                        {dept.employees.length > 3 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{dept.employees.length - 3} more</div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
