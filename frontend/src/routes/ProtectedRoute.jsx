import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DASHBOARDS = {
    employee: '/employee/assets',
    store_manager: '/store-manager/inventory',
    manager: '/manager/dashboard',
    director: '/director/reports',
};

export const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
};

export const RoleRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    if (!roles.includes(user.role)) {
        return <Navigate to={ROLE_DASHBOARDS[user.role] || '/login'} replace />;
    }
    return children;
};

export const ROLE_DASHBOARDS_MAP = ROLE_DASHBOARDS;
