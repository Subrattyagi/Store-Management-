import { NavLink, Outlet } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/* ─── SVG Icons ─── */
const IconAssets = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);
const IconIssues = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const IconExit = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const NAV_ITEMS = [
    { to: '/employee/assets', label: 'My Assets', Icon: IconAssets },
    { to: '/employee/issues', label: 'Issues', Icon: IconIssues },
    { to: '/employee/exit-status', label: 'Exit Status', Icon: IconExit },
];

function MobileBottomNav() {
    return (
        <nav className="mobile-bottom-nav">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
                    {({ isActive }) => (
                        <>
                            {isActive && <span className="mobile-nav-indicator" />}
                            <span className="mobile-nav-icon"><Icon /></span>
                            <span className="mobile-nav-label">{label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}

export default function EmployeeLayout() {
    const { isCollapsed } = useSidebar();

    return (
        <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Sidebar: hidden on mobile via CSS */}
            <Sidebar />
            <div className="main-wrapper">
                <TopBar />
                <main className="main-content employee-page">
                    <Outlet />
                </main>
            </div>
            {/* Bottom nav: only visible on mobile via CSS */}
            <MobileBottomNav />
        </div>
    );
}
