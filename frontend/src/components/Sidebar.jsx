import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useState, useEffect } from 'react';
import { assetRequestsAPI } from '../api';

const NAV_ITEMS = {
    employee: [
        { label: 'My Assets', path: '/employee/assets', icon: <AssetIcon /> },
        { label: 'Issues', path: '/employee/issues', icon: <AlertIcon /> },
        { label: 'Exit Status', path: '/employee/exit-status', icon: <ExitIcon /> },
    ],
    store_manager: [
        { label: 'Inventory', path: '/store-manager/inventory', icon: <InventoryIcon /> },
        { label: 'Add Asset', path: '/store-manager/add-asset', icon: <AddIcon /> },
        { label: 'Asset Requests', path: '/store-manager/asset-requests', icon: <RequestIcon />, badge: true },
        { label: 'Purchases', path: '/store-manager/purchases', icon: <PurchaseIcon /> },
        { label: 'Maintenance', path: '/store-manager/maintenance', icon: <WrenchIcon /> },
        { label: 'Verify Returns', path: '/store-manager/returns', icon: <ReturnIcon /> },
        { label: 'Assignment History', path: '/store-manager/assignment-history', icon: <HistoryIcon /> },
        { label: 'Issues', path: '/store-manager/issues', icon: <AlertIcon /> },
    ],
    manager: [
        { label: 'Dashboard', path: '/manager/dashboard', icon: <DashIcon />, permKey: 'dashboard' },
        { label: 'Employees', path: '/manager/employees', icon: <PeopleIcon />, permKey: 'employees' },
        { label: 'Allocations', path: '/manager/allocations', icon: <AllocIcon />, permKey: 'allocations' },
        { label: 'Asset Requests', path: '/manager/asset-requests', icon: <RequestIcon />, badge: true, permKey: 'asset_requests' },
        { label: 'Exit Clearance', path: '/manager/exit-clearance', icon: <ClearIcon />, permKey: 'exit_clearance' },
    ],
    director: [
        { label: 'Reports', path: '/director/reports', icon: <ReportIcon /> },
        { label: 'Audit Logs', path: '/director/audit-logs', icon: <AuditIcon /> },
        { label: 'Role Management', path: '/director/roles', icon: <RoleIcon /> },
        { label: 'Exit Approvals', path: '/director/exit-approvals', icon: <ApproveIcon /> },
    ],
};

const ROLE_META = {
    employee: { label: 'Employee', color: '#6366f1' },
    store_manager: { label: 'Store Manager', color: '#f59e0b' },
    manager: { label: 'Manager', color: '#10b981' },
    director: { label: 'Director', color: '#a855f7' },
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isCollapsed, toggle } = useSidebar();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (user?.role === 'manager' || user?.role === 'store_manager') {
            assetRequestsAPI.getPendingCount()
                .then(res => setPendingCount(res.data.data.count))
                .catch(() => { });
            // Refresh every 60s
            const interval = setInterval(() => {
                assetRequestsAPI.getPendingCount()
                    .then(res => setPendingCount(res.data.data.count))
                    .catch(() => { });
            }, 60000);
            return () => clearInterval(interval);
        }
    }, [user?.role]);

    const handleToggle = () => {
        toggle();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // For managers: filter nav items by their permissions
    const allNavItems = NAV_ITEMS[user?.role] || [];
    const navItems = user?.role === 'manager'
        ? allNavItems.filter(item => !item.permKey || (user.permissions || []).includes(item.permKey))
        : allNavItems;
    const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    const meta = ROLE_META[user?.role] || { label: user?.role, color: '#6366f1' };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            style={{
                /* Use the dark theme defined in index.css instead of overriding to white */
                borderRight: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)'
            }}>
            {/* Toggle Button */}
            <button className="sidebar-toggle" onClick={handleToggle} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} style={{ background: '#111008', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#d4af37', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isCollapsed ? (
                        <polyline points="13 17 18 12 13 7" />
                    ) : (
                        <polyline points="11 17 6 12 11 7" />
                    )}
                    {isCollapsed && <polyline points="18 17 23 12 18 7" />}
                </svg>
            </button>

            {/* Premium Bhautiki+ Brand Logo */}
            <div className="brand-logo-wrap premium-logo-glow" style={{ padding: '1.25rem 3.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', overflow: 'hidden', background: 'transparent', flexShrink: 0 }}>
                <img src="/bhautiki.png" alt="Bhautiki+" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
            </div>

            {/* Collapsed: mini logo snippet or scaled down image */}
            <div className="brand-logo-mini premium-logo-glow" style={{ padding: '0.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', overflow: 'hidden', background: 'transparent', flexShrink: 0 }}>
                <img src="/bhautiki.png" alt="Bhautiki+" style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }} />
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav" style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active premium-nav' : ''}`}
                        title={isCollapsed ? item.label : ''}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '0.85rem',
                            padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
                            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                            fontSize: '0.9rem', fontWeight: isActive ? 700 : 500,
                            background: isActive ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))' : 'transparent',
                            color: isActive ? '#f5d060' : 'rgba(255, 255, 255, 0.65)',
                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                            border: isActive ? '1px solid rgba(212, 175, 55, 0.2)' : '1px solid transparent',
                            boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.5)' : 'none'
                        })}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="nav-icon" style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                                {item.badge && pendingCount > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', minWidth: 18, height: 18,
                                        borderRadius: 999, background: isActive ? '#d4af37' : '#ef4444',
                                        color: isActive ? '#0a0a0a' : '#fff', fontSize: '0.65rem', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0 4px', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                    }}>{pendingCount}</span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer" style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(212, 175, 55, 0.2)', marginTop: 'auto' }}>
                <div
                    className={`user-card ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={() => navigate('/profile')}
                    style={{ cursor: 'pointer', padding: isCollapsed ? '0' : '0.75rem', background: isCollapsed ? 'transparent' : 'rgba(255,255,255,0.03)', border: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'background 0.2s' }}
                    onMouseEnter={e => { if (!isCollapsed) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={e => { if (!isCollapsed) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                    <div className="user-avatar" style={{ background: `linear-gradient(135deg, rgba(212, 175, 55, 0.8), rgba(212, 175, 55, 0.4))`, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 800, boxShadow: `0 4px 12px rgba(0,0,0,0.5)`, flexShrink: 0, position: 'relative' }}>
                        {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user?.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            initials
                        )}
                        {!isCollapsed && <span className="user-avatar-dot" style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: '#10b981', borderRadius: '50%', border: '2px solid #0a0a0a' }} />}
                    </div>
                    {!isCollapsed && (
                        <div className="user-info" style={{ minWidth: 0, flex: 1 }}>
                            <div className="user-name" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div className="user-role" style={{ fontSize: '0.65rem', color: 'rgba(212, 175, 55, 0.8)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</div>
                        </div>
                    )}
                </div>
                <button className="logout-btn premium-logout" onClick={handleLogout} title={isCollapsed ? 'Sign Out' : ''}
                    style={{
                        padding: isCollapsed ? '0.75rem' : '0.75rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '0.85rem',
                        width: '100%',
                        borderRadius: '999px', /* Pill shape */
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01))',
                        color: 'rgba(239, 68, 68, 0.9)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        marginTop: '0.5rem'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))';
                        e.currentTarget.style.color = '#fca5a5';
                        e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01))';
                        e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
                        e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(239,68,68,0.3))' }}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {!isCollapsed && <span style={{ letterSpacing: '0.02em' }}>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}

/* ── Inline SVG Icons ── */
function AssetIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-4 0v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
    );
}

function ExitIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

function InventoryIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}

function AddIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    );
}

function ReturnIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.53" />
        </svg>
    );
}

function DashIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
}

function PeopleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function AllocIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    );
}

function ClearIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function ReportIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function AuditIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}

function RoleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}

function ApproveIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
            <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            <path d="M9.5 14.5v-5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5z" />
            <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
            <path d="M14 14.5v-1c0-.83.67-1.5 1.5-1.5h5.5v6c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2v-6h5.5c.83 0 1.5.67 1.5 1.5" />
        </svg>
    );
}

function RequestIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
    );
}

function HistoryIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.53" />
            <line x1="12" y1="7" x2="12" y2="12" />
            <polyline points="12 12 15 14" />
        </svg>
    );
}

function PurchaseIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    );
}

function WrenchIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
