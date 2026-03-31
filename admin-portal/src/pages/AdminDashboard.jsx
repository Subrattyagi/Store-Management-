import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAPI } from '../api';
import toast from 'react-hot-toast';

const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Manager Permission Options (with module icons) ───────────────────────────
const MANAGER_PERMISSIONS = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        desc: 'Summary stats & overview',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
    },
    {
        key: 'employees',
        label: 'Employees',
        desc: 'Team members & profiles',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    },
    {
        key: 'asset_requests',
        label: 'Asset Requests',
        desc: 'Approve or reject requests',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>,
    },
    {
        key: 'allocations',
        label: 'Allocations',
        desc: 'View & manage allocations',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    },
    {
        key: 'exit_clearance',
        label: 'Exit Clearance',
        desc: 'Handle employee exit process',
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    },
];

// ─── Shared Icons ─────────────────────────────────────────────────────────────
const icons = {
    employee: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
    manager: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    store: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    overview: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>,
    user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
    info: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
    logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    edit: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    calendar: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
};

// ─── Premium Manager Card List ────────────────────────────────────────────────
function ManagerCards({ managers, onDelete, onEditPerms }) {
    if (managers.length === 0) {
        return (
            <div className="mgr-empty">
                <div className="mgr-empty-icon">{icons.manager}</div>
                <p className="mgr-empty-text">No managers yet</p>
                <p className="mgr-empty-sub">Create your first manager using the form.</p>
            </div>
        );
    }
    return (
        <div className="mgr-card-list">
            {managers.map((m) => {
                const initials = (m.fullName || m.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const isActive = !m.isTempPassword;
                const perms = m.permissions || [];
                return (
                    <div key={m._id} className="mgr-card">
                        {/* Top row: avatar + info + actions */}
                        <div className="mgr-card-top">
                            <div className="mgr-card-avatar">{initials}</div>
                            <div className="mgr-card-info">
                                <div className="mgr-card-name">{m.fullName || m.name}</div>
                                <div className="mgr-card-email">{m.email}</div>
                            </div>
                            <div className="mgr-card-meta">
                                <div className={`mgr-status-badge ${isActive ? 'active' : 'pending'}`}>
                                    <span className="mgr-status-dot" />
                                    {isActive ? 'Active' : 'Pending'}
                                </div>
                                <div className="mgr-card-date">
                                    {icons.calendar} {formatDate(m.createdAt)}
                                </div>
                            </div>
                            <div className="mgr-card-actions">
                                <button className="mgr-btn-edit" onClick={() => onEditPerms(m)} title="Edit Permissions">
                                    {icons.edit}
                                </button>
                                <button className="mgr-btn-delete" onClick={() => onDelete(m)} title="Delete Manager">
                                    {icons.trash}
                                </button>
                            </div>
                        </div>
                        {/* Permission pills */}
                        <div className="mgr-card-perms">
                            {perms.length > 0 ? (
                                perms.map(p => {
                                    const meta = MANAGER_PERMISSIONS.find(mp => mp.key === p);
                                    return (
                                        <span key={p} className="mgr-perm-chip">
                                            <span className="mgr-perm-chip-icon">{meta?.icon}</span>
                                            {meta?.label || p}
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="mgr-no-perms">No module access assigned</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Generic User Table (employees / store managers) ─────────────────────────
function UserTable({ users, onDelete, showPermissions = false, emptyLabel }) {
    if (users.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">{icons.manager}</div>
                <p>{emptyLabel}</p>
            </div>
        );
    }
    return (
        <div className="table-wrapper">
            <table className="emp-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        {showPermissions && <th>Permissions</th>}
                        <th>Status</th>
                        <th>Joined</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u._id}>
                            <td>
                                <div className="emp-name-cell">
                                    <div className="emp-avatar">
                                        {(u.fullName || u.name || '?')[0].toUpperCase()}
                                    </div>
                                    <span className="emp-name">{u.fullName || u.name}</span>
                                </div>
                            </td>
                            <td className="emp-email">{u.email}</td>
                            {showPermissions && (
                                <td>
                                    <div className="perm-tags">
                                        {u.permissions && u.permissions.length > 0
                                            ? u.permissions.map((p) => {
                                                const found = MANAGER_PERMISSIONS.find(mp => mp.key === p);
                                                return <span key={p} className="perm-tag">{found ? found.label : p}</span>;
                                            })
                                            : <span className="perm-none">No permissions</span>
                                        }
                                    </div>
                                </td>
                            )}
                            <td>
                                <div className="beacon-wrap">
                                    <span className={`beacon ${u.isTempPassword ? 'pending' : 'active'}`} />
                                    <span className="beacon-label">
                                        {u.isTempPassword ? 'Pending Reset' : 'Active'}
                                    </span>
                                </div>
                            </td>
                            <td className="emp-date">{formatDate(u.createdAt)}</td>
                            <td>
                                <button className="btn-delete" onClick={() => onDelete(u)} title="Delete">
                                    {icons.trash}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Create Form (base) ───────────────────────────────────────────────────────
function BaseForm({ onSubmit, submitting, submitLabel, children }) {
    return (
        <form onSubmit={onSubmit} className="create-form">
            <div className="field-group">
                <label className="field-label">Full Name</label>
                <div className="input-wrap">
                    <span className="input-icon">{icons.user}</span>
                    <input
                        type="text"
                        name="fullName"
                        className="field-input"
                        required
                        placeholder="e.g. Rahul Sharma"
                        id="form-fullname"
                    />
                </div>
            </div>
            <div className="field-group">
                <label className="field-label">Email Address</label>
                <div className="input-wrap">
                    <span className="input-icon">{icons.mail}</span>
                    <input
                        type="email"
                        name="email"
                        className="field-input"
                        required
                        placeholder="user@bhautiki.com"
                        id="form-email"
                    />
                </div>
            </div>
            {children}
            <div className="info-callout">
                {icons.info}
                A secure temporary password is auto-generated and delivered to the email immediately.
            </div>
            <button type="submit" className="btn-gold" disabled={submitting} id="create-user-btn">
                {submitting ? (
                    <>
                        <span className="spinner" style={{ borderTopColor: '#1a1200', borderColor: 'rgba(26,18,0,0.3)' }} />
                        Creating account…
                    </>
                ) : (
                    <>{icons.plus} {submitLabel}</>
                )}
            </button>
        </form>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const { adminUser, adminLogout } = useAdminAuth();
    const navigate = useNavigate();

    const [activeNav, setActiveNav] = useState('employees');
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [employees, setEmployees] = useState([]);
    const [managers, setManagers] = useState([]);
    const [storeManagers, setStoreManagers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Manager permissions state (create form)
    const [selectedPerms, setSelectedPerms] = useState([]);

    // Edit permissions panel state
    const [editingManager, setEditingManager] = useState(null); // manager object being edited
    const [editPerms, setEditPerms] = useState([]);             // current perm selection in panel
    const [editSaving, setEditSaving] = useState(false);

    const togglePerm = (key) => {
        setSelectedPerms((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const toggleEditPerm = (key) => {
        setEditPerms((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const openEditPanel = (manager) => {
        setEditingManager(manager);
        setEditPerms(manager.permissions || []);
    };

    const closeEditPanel = () => {
        setEditingManager(null);
        setEditPerms([]);
    };

    const handleSavePermissions = async () => {
        if (!editingManager) return;
        setEditSaving(true);
        try {
            const res = await adminAPI.updateManagerPermissions(editingManager._id, editPerms);
            const updated = res.data.data.manager;
            setManagers((prev) =>
                prev.map((m) => m._id === updated._id ? { ...m, permissions: updated.permissions } : m)
            );
            toast.success(`Permissions updated for ${editingManager.fullName || editingManager.name}`);
            closeEditPanel();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update permissions');
        } finally {
            setEditSaving(false);
        }
    };

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [empRes, mgrRes, smRes] = await Promise.all([
                adminAPI.getEmployees(),
                adminAPI.getManagers(),
                adminAPI.getStoreManagers(),
            ]);
            setEmployees(empRes.data.data.employees);
            setManagers(mgrRes.data.data.managers);
            setStoreManagers(smRes.data.data.storeManagers);
        } catch {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Create handlers ──
    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setSubmitting(true);
        try {
            await adminAPI.createEmployee({ fullName: fd.get('fullName'), email: fd.get('email') });
            toast.success('Employee created — credentials sent via email');
            e.target.reset();
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create employee');
        } finally { setSubmitting(false); }
    };

    const handleCreateManager = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setSubmitting(true);
        try {
            await adminAPI.createManager({
                fullName: fd.get('fullName'),
                email: fd.get('email'),
                permissions: selectedPerms,
            });
            toast.success('Manager created — credentials sent via email');
            e.target.reset();
            setSelectedPerms([]);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create manager');
        } finally { setSubmitting(false); }
    };

    const handleCreateStoreManager = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setSubmitting(true);
        try {
            await adminAPI.createStoreManager({ fullName: fd.get('fullName'), email: fd.get('email') });
            toast.success('Store Manager created — credentials sent via email');
            e.target.reset();
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create store manager');
        } finally { setSubmitting(false); }
    };

    // ── Delete handlers ──
    const handleDelete = async (user, role) => {
        const label = { employee: 'Employee', manager: 'Manager', store_manager: 'Store Manager' }[role];
        const ok = window.confirm(
            `Delete "${user.fullName || user.name}" (${user.email})?\n\nThis action cannot be undone.`
        );
        if (!ok) return;
        try {
            if (role === 'employee') await adminAPI.deleteEmployee(user._id);
            else if (role === 'manager') await adminAPI.deleteManager(user._id);
            else await adminAPI.deleteStoreManager(user._id);
            toast.success(`${label} "${user.fullName || user.name}" deleted`);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleLogout = () => {
        adminLogout();
        navigate('/');
        toast('Logged out');
    };

    // ── Stats ──
    const stats = activeNav === 'employees'
        ? [
            { label: 'Total Employees', value: employees.length, cls: 'gold' },
            { label: 'Active Accounts', value: employees.filter(e => !e.isTempPassword).length, cls: 'green' },
            { label: 'Pending Reset', value: employees.filter(e => e.isTempPassword).length, cls: 'amber' },
        ]
        : activeNav === 'managers'
            ? [
                { label: 'Total Managers', value: managers.length, cls: 'gold' },
                { label: 'Active Accounts', value: managers.filter(m => !m.isTempPassword).length, cls: 'green' },
                { label: 'Pending Reset', value: managers.filter(m => m.isTempPassword).length, cls: 'amber' },
            ]
            : [
                { label: 'Total Store Managers', value: storeManagers.length, cls: 'gold' },
                { label: 'Active Accounts', value: storeManagers.filter(s => !s.isTempPassword).length, cls: 'green' },
                { label: 'Pending Reset', value: storeManagers.filter(s => s.isTempPassword).length, cls: 'amber' },
            ];

    const navItems = [
        { id: 'employees', label: 'Employees', icon: icons.employee },
        { id: 'managers', label: 'Managers', icon: icons.manager },
        { id: 'store_managers', label: 'Store Managers', icon: icons.store },
    ];

    const sectionConfig = {
        employees: {
            title: 'Employee Management',
            subtitle: 'Manage system-wide employee access and onboarding credentials',
            formTitle: 'Create New Employee',
            formSubtitle: 'Credentials are emailed automatically on creation',
            submitLabel: 'Create Employee & Send Credentials',
            directoryTitle: 'Employee Directory',
            directorySubtitle: `${employees.length} ${employees.length === 1 ? 'employee' : 'employees'} registered`,
            emptyLabel: 'No employees yet. Create the first one.',
            users: employees,
            onSubmit: handleCreateEmployee,
            role: 'employee',
            showPermissions: false,
        },
        managers: {
            title: 'Manager Management',
            subtitle: 'Create manager accounts with granular module-level permissions',
            formTitle: 'Create New Manager',
            formSubtitle: 'Set permissions to control which modules this manager can access',
            submitLabel: 'Create Manager & Send Credentials',
            directoryTitle: 'Manager Directory',
            directorySubtitle: `${managers.length} ${managers.length === 1 ? 'manager' : 'managers'} registered`,
            emptyLabel: 'No managers yet. Create the first one.',
            users: managers,
            onSubmit: handleCreateManager,
            role: 'manager',
            showPermissions: true,
        },
        store_managers: {
            title: 'Store Manager Management',
            subtitle: 'Manage store manager accounts with full store-level access',
            formTitle: 'Create New Store Manager',
            formSubtitle: 'Store managers have full access to all store operations',
            submitLabel: 'Create Store Manager & Send Credentials',
            directoryTitle: 'Store Manager Directory',
            directorySubtitle: `${storeManagers.length} ${storeManagers.length === 1 ? 'store manager' : 'store managers'} registered`,
            emptyLabel: 'No store managers yet. Create the first one.',
            users: storeManagers,
            onSubmit: handleCreateStoreManager,
            role: 'store_manager',
            showPermissions: false,
        },
    };

    const section = sectionConfig[activeNav];

    return (
        <div className="dashboard-root">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-logo-wrap">
                        <img src="/bhautiki.png" alt="Bhautiki" className="sidebar-real-logo" />
                    </div>
                    <div className="sidebar-brand-sub">Admin Portal</div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">User Management</div>
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
                        {icons.logout}
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="dashboard-main">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">{section.title}</h1>
                    <p className="dashboard-subtitle">{section.subtitle}</p>
                </div>
                <div className="dashboard-divider" />

                {/* Stats */}
                <div className="stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className={`stat-card ${s.cls}`}>
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
                                {section.formTitle}
                            </div>
                            <div className="card-subtitle">{section.formSubtitle}</div>
                        </div>

                        <BaseForm
                            onSubmit={section.onSubmit}
                            submitting={submitting}
                            submitLabel={section.submitLabel}
                        >
                            {/* Permissions — only for managers */}
                            {activeNav === 'managers' && (
                                <div className="field-group">
                                    <div className="perm-section-label">
                                        {icons.shield} Module Permissions
                                    </div>
                                    <div className="perm-icon-grid">
                                        {MANAGER_PERMISSIONS.map((perm) => {
                                            const isActive = selectedPerms.includes(perm.key);
                                            return (
                                                <button
                                                    key={perm.key}
                                                    type="button"
                                                    className={`perm-icon-card ${isActive ? 'active' : ''}`}
                                                    onClick={() => togglePerm(perm.key)}
                                                    id={`perm-${perm.key}`}
                                                >
                                                    <div className="pic-icon">{perm.icon}</div>
                                                    <div className="pic-body">
                                                        <div className="pic-label">{perm.label}</div>
                                                        <div className="pic-desc">{perm.desc}</div>
                                                    </div>
                                                    <div className="pic-check">
                                                        {isActive && icons.check}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedPerms.length === 0 && (
                                        <div className="perm-warning">
                                            {icons.info} No permissions selected — manager will have no module access.
                                        </div>
                                    )}
                                </div>
                            )}
                        </BaseForm>
                    </div>

                    {/* Directory Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-title-dot" />
                                {section.directoryTitle}
                            </div>
                            <div className="card-subtitle">{section.directorySubtitle}</div>
                        </div>

                        {loading ? (
                            <div className="table-loading">
                                <div className="spinner-lg" />
                                <span>Loading directory…</span>
                            </div>
                        ) : activeNav === 'managers' ? (
                            <ManagerCards
                                managers={section.users}
                                onDelete={(u) => handleDelete(u, 'manager')}
                                onEditPerms={openEditPanel}
                            />
                        ) : (
                            <UserTable
                                users={section.users}
                                onDelete={(u) => handleDelete(u, section.role)}
                                showPermissions={false}
                                emptyLabel={section.emptyLabel}
                            />
                        )}
                    </div>
                </div>
            </main>

            {/* ── Edit Permissions Panel (Slide-in Drawer) ── */}
            {editingManager && (
                <>
                    {/* Backdrop */}
                    <div className="perm-panel-backdrop" onClick={closeEditPanel} />
                    {/* Panel */}
                    <div className="perm-panel">
                        <div className="perm-panel-header">
                            <div>
                                <div className="perm-panel-title">
                                    {icons.shield} Edit Permissions
                                </div>
                                <div className="perm-panel-subtitle">
                                    {editingManager.fullName || editingManager.name} · {editingManager.email}
                                </div>
                            </div>
                            <button className="perm-panel-close" onClick={closeEditPanel}>
                                {icons.close}
                            </button>
                        </div>

                        <div className="perm-panel-body">
                            <div className="perm-section-label">
                                {icons.shield} Module Access
                            </div>
                            <div className="perm-icon-grid">
                                {MANAGER_PERMISSIONS.map((perm) => {
                                    const isActive = editPerms.includes(perm.key);
                                    return (
                                        <button
                                            key={perm.key}
                                            type="button"
                                            className={`perm-icon-card ${isActive ? 'active' : ''}`}
                                            onClick={() => toggleEditPerm(perm.key)}
                                        >
                                            <div className="pic-icon">{perm.icon}</div>
                                            <div className="pic-body">
                                                <div className="pic-label">{perm.label}</div>
                                                <div className="pic-desc">{perm.desc}</div>
                                            </div>
                                            <div className="pic-check">
                                                {isActive && icons.check}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {editPerms.length === 0 && (
                                <div className="perm-warning">
                                    {icons.info} No permissions selected — manager will have no module access.
                                </div>
                            )}
                        </div>

                        <div className="perm-panel-footer">
                            <button className="btn-ghost" onClick={closeEditPanel}>
                                Cancel
                            </button>
                            <button
                                className="btn-gold-sm"
                                onClick={handleSavePermissions}
                                disabled={editSaving}
                            >
                                {editSaving ? (
                                    <><span className="spinner" style={{ borderTopColor: '#1a1200', borderColor: 'rgba(26,18,0,0.3)', width: 12, height: 12 }} /> Saving…</>
                                ) : (
                                    <>{icons.check} Save Permissions</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
