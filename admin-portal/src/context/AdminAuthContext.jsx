import { createContext, useContext, useState } from 'react';
import api from '../api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
    const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
    const [adminUser, setAdminUser] = useState(() => {
        const stored = localStorage.getItem('adminUser');
        return stored ? JSON.parse(stored) : null;
    });

    const adminLogin = async (email, password) => {
        const res = await api.post('/admin/login', { email, password });
        const { token, data } = res.data;
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        setAdminToken(token);
        setAdminUser(data.user);
        return data.user;
    };

    const adminLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setAdminToken(null);
        setAdminUser(null);
    };

    return (
        <AdminAuthContext.Provider value={{ adminToken, adminUser, adminLogin, adminLogout }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return ctx;
};
