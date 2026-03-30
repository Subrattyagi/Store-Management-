import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../api';
import toast from 'react-hot-toast';

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function AdminDashboard() {
    const { adminUser, adminLogout } = useAdminAuth();
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ fullName: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [activeNav, setActiveNav] = useState('employees');

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getEmployees();
            setEmployees(res.data.data.employees);
        } catch {
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await adminAPI.createEmployee(formData);
            toast.success('Employee created — credentials sent via email');
            setFormData({ fullName: '', email: '' });
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (emp) => {
        const ok = window.confirm(
            `Delete "${emp.fullName || emp.name}" (${emp.email})?\n\nYou can re-create them with the same email.`
        );
        if (!ok) return;
        try {
            await adminAPI.deleteEmployee(emp._id);
            toast.success(`"${emp.fullName || emp.name}" deleted`);
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleLogout = () => {
        adminLogout();
        navigate('/');
        toast('Logged out');
    };

    const stats = [
        {
            label: 'Total Employees', value: employees.length, cls: 'gold',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        },
        {
            label: 'Active Accounts', value: employees.filter(e => !e.isTempPassword).length, cls: 'green',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        },
        {
            label: 'Pending Reset', value: employees.filter(e => e.isTempPassword).length, cls: 'amber',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        },
    ];

    const navItems = [
        {
            id: 'dashboard', label: 'Overview',
            icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        },
        {
            id: 'employees', label: 'Employees',
            icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        },
    ];

    return (
        <div className="dashboard-root">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-logo-wrap">
                        <img
                            src="/bhautiki.png"
                            alt="Bhautiki"
                            className="sidebar-real-logo"
                        />
                    </div>
                    <div className="sidebar-brand-sub">Admin Portal</div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Navigation</div>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
                            onClick={() => setActiveNav(item.id)}
                            id={`nav-${item.id}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">A</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">Administrator</div>
                            <div className="sidebar-user-email">{adminUser?.email}</div>
                        </div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} id="logout-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="dashboard-main">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Employee Management</h1>
                    <p className="dashboard-subtitle">Manage system-wide employee access and onboarding credentials</p>
                </div>
                <div className="dashboard-divider" />

                {/* Stats */}
                <div className="stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className={`stat-card ${s.cls}`}>
                            <div className="stat-icon-wrap">{s.icon}</div>
                            <div>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content Grid */}
                <div className="content-grid">
                    {/* Create Form */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-title-dot" />
                                Create New Employee
                            </div>
                            <div className="card-subtitle">Credentials are emailed automatically on creation</div>
                        </div>

                        <form onSubmit={handleCreate} className="create-form">
                            <div className="field-group">
                                <label className="field-label">Full Name</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </span>
                                    <input
                                        type="text"
                                        className="field-input"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                        placeholder="e.g. Rahul Sharma"
                                        id="employee-fullname"
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Email Address</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                    </span>
                                    <input
                                        type="email"
                                        className="field-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="employee@bhautiki.com"
                                        id="employee-email"
                                    />
                                </div>
                            </div>

                            <div className="info-callout">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                A secure temporary password is auto-generated and delivered to the employee's email immediately.
                            </div>

                            <button type="submit" className="btn-gold" disabled={submitting} id="create-employee-btn">
                                {submitting ? (
                                    <>
                                        <span className="spinner" style={{ borderTopColor: '#1a1200', borderColor: 'rgba(26,18,0,0.3)' }} />
                                        Creating account…
                                    </>
                                ) : (
                                    <>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Create Employee &amp; Send Credentials
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Employee Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-title-dot" />
                                Employee Directory
                            </div>
                            <div className="card-subtitle">{employees.length} {employees.length === 1 ? 'employee' : 'employees'} registered</div>
                        </div>

                        {loading ? (
                            <div className="table-loading">
                                <div className="spinner-lg" />
                                <span>Loading directory…</span>
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                    </svg>
                                </div>
                                <p>No employees yet. Create the first one.</p>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="emp-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <tr key={emp._id}>
                                                <td>
                                                    <div className="emp-name-cell">
                                                        <div className="emp-avatar">
                                                            {(emp.fullName || emp.name || '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="emp-name">{emp.fullName || emp.name}</span>
                                                    </div>
                                                </td>
                                                <td className="emp-email">{emp.email}</td>
                                                <td>
                                                    <div className="beacon-wrap">
                                                        <span className={`beacon ${emp.isTempPassword ? 'pending' : 'active'}`} />
                                                        <span className="beacon-label">
                                                            {emp.isTempPassword ? 'Pending Reset' : 'Active'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="emp-date">{formatDate(emp.createdAt)}</td>
                                                <td>
                                                    <button className="btn-delete" onClick={() => handleDelete(emp)} title="Delete employee">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                                                            <path d="M10 11v6" /><path d="M14 11v6" />
                                                            <path d="M9 6V4h6v2" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
