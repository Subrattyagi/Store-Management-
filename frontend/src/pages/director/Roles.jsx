import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

const ROLES = ['employee', 'store_manager', 'manager', 'director'];
const ROLE_META = {
    employee: { color: '#6366f1', bg: '#eef2ff' },
    store_manager: { color: '#d97706', bg: '#fffbeb' },
    manager: { color: '#059669', bg: '#ecfdf5' },
    director: { color: '#7c3aed', bg: '#fdf4ff' },
};

export default function Roles() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee', department: '' });
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await usersAPI.getAll();
            setUsers(res.data.data.users);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await authAPI.register(formData);
            toast.success('User created successfully');
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '', role: 'employee', department: '' });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const updateRole = async (id, newRole) => {
        if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
        try {
            await usersAPI.updateRole(id, { role: newRole });
            toast.success('Role updated');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };

    const softDelete = async (id) => {
        if (!window.confirm('Deactivate this user? They will lose all access.')) return;
        try {
            await usersAPI.delete(id);
            toast.success('User deactivated');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Deactivation failed');
        }
    };

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Role Management</h1>
                    <p>Create accounts and manage system-wide RBAC assignments</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Create User
                </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <input className="form-input" style={{ maxWidth: 320 }} placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="user-list">
                {filtered.map((user) => {
                    const meta = ROLE_META[user.role] || { color: '#94a3b8', bg: '#f8fafc' };
                    return (
                        <div key={user._id} className="user-list-item">
                            <div className="user-list-avatar" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)` }}>
                                {getInitials(user.name)}
                            </div>
                            <div className="user-list-info">
                                <div className="user-list-name">{user.name}</div>
                                <div className="user-list-email">{user.email}</div>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{user.department || '—'}</div>
                            <StatusBadge status={user.status} />
                            <select
                                style={{ padding: '0.35rem 0.625rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'Outfit, sans-serif', background: meta.bg, color: meta.color, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                value={user.role}
                                onChange={(e) => updateRole(user._id, e.target.value)}
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                            </select>
                            <button className="btn btn-danger btn-sm" onClick={() => softDelete(user._id)}>
                                Deactivate
                            </button>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="card">
                        <div className="empty-state"><span className="empty-icon">👥</span><h3>No users found</h3></div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New User Account</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <form id="createUserForm" onSubmit={handleCreateUser}>
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" className="form-input" required value={formData.name} placeholder="John Doe" onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" className="form-input" required value={formData.email} placeholder="john@company.com" onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input type="password" className="form-input" required minLength="6" value={formData.password} placeholder="Min. 6 characters" onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">System Role</label>
                                        <select className="form-select" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Department</label>
                                        <input type="text" className="form-input" value={formData.department} placeholder="e.g. Engineering" onChange={e => setFormData({ ...formData, department: e.target.value })} />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button type="submit" form="createUserForm" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
