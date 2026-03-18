import { useState, useEffect } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = { available: '#10b981', issued: '#6366f1', return_requested: '#f59e0b', under_maintenance: '#ef4444', lost: '#f43f5e' };

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.625rem 0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{payload[0].name.replace(/_/g, ' ')}</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{payload[0].value} assets</div>
        </div>
    );
};

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await reportsAPI.getSummary();
                setSummary(res.data.data);
            } catch {
                toast.error('Failed to load dashboard metrics');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const statusData = Object.entries(summary.byStatus || {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Manager Dashboard</h1>
                    <p>Live overview of assets and team metrics</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="stat-grid">
                <div className="stat-card accent">
                    <div className="stat-icon accent">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.totalAssets}</div>
                        <div className="stat-label">Total Assets</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.totalUsers}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>
                <div className="stat-card info">
                    <div className="stat-icon info">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.byStatus?.issued || 0}</div>
                        <div className="stat-label">Assets Issued</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.53" /></svg>
                    </div>
                    <div>
                        <div className="stat-value">{summary.byStatus?.return_requested || 0}</div>
                        <div className="stat-label">Pending Returns</div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-card">
                <div className="section-header">
                    <div>
                        <div className="section-title">Asset Status Distribution</div>
                        <div className="section-subtitle">Breakdown of all {summary.totalAssets} assets by current status</div>
                    </div>
                </div>
                {statusData.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📊</span><h3>No data yet</h3><p>Add some assets to see the distribution chart.</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%" cy="50%"
                                innerRadius={90} outerRadius={130}
                                paddingAngle={3} dataKey="value"
                            >
                                {statusData.map((entry) => (
                                    <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                formatter={(value) => value.replace(/_/g, ' ')}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '0.8rem', textTransform: 'capitalize' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
