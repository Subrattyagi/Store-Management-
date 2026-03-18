import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationsAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const intervalRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const res = await notificationsAPI.getUnreadCount();
            setUnreadCount(res.data.data.count);
        } catch {
            // silently ignore polling errors
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await notificationsAPI.getAll();
            setNotifications(res.data.data.notifications);
            // Update unread count from fetched data
            const unread = res.data.data.notifications.filter((n) => !n.isRead).length;
            setUnreadCount(unread);
        } catch {
            // silently ignore errors
        }
    }, [user]);

    const markAsRead = useCallback(async (id) => {
        try {
            await notificationsAPI.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // silently ignore
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsAPI.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch {
            // silently ignore
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        // Initial fetch
        fetchUnreadCount();

        // Poll every 30 seconds for unread count
        intervalRef.current = setInterval(fetchUnreadCount, 30000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [user, fetchUnreadCount]);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};
