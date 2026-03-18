import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ─── Relative time helper ─── */
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

/* ─── Notification type → icon ─── */
function NotifIcon({ type }) {
    const icons = {
        asset_request_created: { bg: '#eef2ff', color: '#6366f1', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg> },
        asset_request_approved: { bg: '#ecfdf5', color: '#10b981', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
        asset_request_rejected: { bg: '#fef2f2', color: '#ef4444', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> },
        asset_request_assigned: { bg: '#eff6ff', color: '#3b82f6', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2" /></svg> },
        asset_request_purchase: { bg: '#fffbeb', color: '#f59e0b', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg> },
        return_requested: { bg: '#fffbeb', color: '#f59e0b', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.53" /></svg> },
        return_approved: { bg: '#ecfdf5', color: '#10b981', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
        exit_clearance_initiated: { bg: '#fff7ed', color: '#f97316', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> },
        exit_clearance_approved: { bg: '#ecfdf5', color: '#10b981', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> },
        exit_clearance_rejected: { bg: '#fef2f2', color: '#ef4444', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> },
        general: { bg: '#f1f5f9', color: '#64748b', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> },
    };
    const config = icons[type] || icons.general;
    return (
        <span className="notif-type-icon" style={{ background: config.bg, color: config.color }}>
            {config.svg}
        </span>
    );
}

const ROLE_META = {
    employee: { label: 'Employee', color: '#6366f1' },
    store_manager: { label: 'Store Manager', color: '#f59e0b' },
    manager: { label: 'Manager', color: '#10b981' },
    director: { label: 'Director', color: '#a855f7' },
};

export default function TopBar() {
    const { user } = useAuth();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const btnRef = useRef(null);

    const meta = ROLE_META[user?.role] || { label: user?.role, color: '#6366f1' };
    const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    // Fetch full list when opened
    const handleOpen = () => {
        if (!open) fetchNotifications();
        setOpen(prev => !prev);
    };

    // Click-outside closes panel
    useEffect(() => {
        const handler = (e) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleItemClick = (notif) => {
        if (!notif.isRead) markAsRead(notif._id);
    };

    const recentNotifs = notifications.slice(0, 8);

    return (
        <header className="topbar" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(226, 232, 240, 0.5)', position: 'sticky', top: 0, zIndex: 50 }}>
            {/* Left: page context breadcrumb line */}
            <div className="topbar-left">
                <div className="topbar-greeting" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},&nbsp;
                    <strong style={{ color: 'var(--text)', fontWeight: 800 }}>{user?.name?.split(' ')[0] || 'there'}</strong> 👋
                </div>
            </div>

            {/* Right: notification bell + user chip */}
            <div className="topbar-right">
                {/* Bell */}
                <div className="topbar-notif-wrap">
                    <button
                        ref={btnRef}
                        className={`topbar-bell-btn ${open ? 'open' : ''}`}
                        onClick={handleOpen}
                        aria-label="Notifications"
                        title="Notifications"
                    >
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="topbar-notif-badge">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {open && (
                        <div ref={panelRef} className="topbar-notif-dropdown premium-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                            {/* Header */}
                            <div className="notif-header" style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <span className="notif-header-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 999 }}>
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button className="notif-mark-all" onClick={markAllAsRead} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* List */}
                            <div className="notif-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
                                {recentNotifs.length === 0 ? (
                                    <div className="notif-empty" style={{ padding: '3rem 2rem' }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </svg>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>All caught up! No new notifications.</p>
                                    </div>
                                ) : (
                                    recentNotifs.map((notif) => (
                                        <div
                                            key={notif._id}
                                            className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                                            onClick={() => handleItemClick(notif)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && handleItemClick(notif)}
                                        >
                                            <NotifIcon type={notif.type} />
                                            <div className="notif-body">
                                                <div className="notif-title">{notif.title}</div>
                                                <div className="notif-message">{notif.message}</div>
                                                <div className="notif-time">{timeAgo(notif.createdAt)}</div>
                                            </div>
                                            {!notif.isRead && <span className="notif-dot" />}
                                        </div>
                                    ))
                                )}
                            </div>

                            {notifications.length > 8 && (
                                <div className="topbar-notif-footer" style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                                    <button className="notif-mark-all" onClick={() => { fetchNotifications(); }} style={{ width: '100%', padding: '0.5rem', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text)' }}>
                                        View all {notifications.length} notifications
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User chip */}
                <div className="topbar-user-chip" onClick={() => navigate('/profile')} style={{ background: 'var(--surface)', border: '1px solid rgba(226, 232, 240, 0.8)', padding: '4px 12px 4px 4px', borderRadius: 999, transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'}>
                    <div className="topbar-user-avatar" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}bb)`, width: 32, height: 32, fontSize: '0.75rem', boxShadow: `0 0 10px ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, borderRadius: '50%', overflow: 'hidden' }}>
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            initials
                        )}
                    </div>
                    <div className="topbar-user-info" style={{ paddingLeft: '0.35rem' }}>
                        <div className="topbar-user-name" style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{user?.name}</div>
                        <div className="topbar-user-role" style={{ color: meta.color, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</div>
                    </div>
                </div>
            </div>
        </header>
    );
}
