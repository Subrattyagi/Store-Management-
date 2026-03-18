import { useState, useEffect } from 'react';
import { usersAPI } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

export default function Employees() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await usersAPI.getAll({ role: 'employee' });
                setUsers(res.data.data.users);
            } catch {
                toast.error('Failed to load employees');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    const filtered = users.filter(u =>
        !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Employee Directory</h1>
                    <p>All employees in the organization</p>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <input
                    className="form-input"
                    style={{ maxWidth: 320 }}
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <span className="empty-icon">👥</span>
                        <h3>No employees found</h3>
                        <p>Try a different search term.</p>
                    </div>
                </div>
            ) : (
                <div className="user-list">
                    {filtered.map((user) => (
                        <div key={user._id} className="user-list-item">
                            <div className="user-list-avatar">{getInitials(user.name)}</div>
                            <div className="user-list-info">
                                <div className="user-list-name">{user.name}</div>
                                <div className="user-list-email">{user.email}</div>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', minWidth: 120 }}>
                                {user.department || <span style={{ fontStyle: 'italic' }}>No department</span>}
                            </div>
                            <StatusBadge status={user.status} />
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', minWidth: 90, textAlign: 'right' }}>
                                {new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
