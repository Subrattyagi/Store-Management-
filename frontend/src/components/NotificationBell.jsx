import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

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

export default function NotificationBell({ isCollapsed }) {
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const btnRef = useRef(null);

    // Fetch full list when opened
    const handleOpen = () => {
        if (!open) fetchNotifications();
        setOpen((prev) => !prev);
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

    return (
        <div className="notif-bell-wrap">
            <button
                ref={btnRef}
                className={`notif-bell-btn ${open ? 'open' : ''}`}
                onClick={handleOpen}
                title={isCollapsed ? `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` : ''}
                aria-label="Notifications"
            >
                <span className="notif-bell-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="notif-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </span>
                {!isCollapsed && <span className="notif-bell-label">Notifications</span>}
                {!isCollapsed && unreadCount > 0 && (
                    <span className="notif-pill">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div ref={panelRef} className="notif-dropdown">
                    {/* Header */}
                    <div className="notif-header">
                        <span className="notif-header-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all" onClick={markAllAsRead}>
                                Mark all read
                            </button>
                        )}  
                    </div>
                           
                    {/* List */}
                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                <p>You're all caught up!</p>
                            </div>  
                        ) : (
                            notifications.map((notif) => (
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
                </div>
            )}
        </div>
    );
}
