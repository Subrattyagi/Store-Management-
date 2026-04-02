import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000, // 15 second timeout — prevents hanging when DB is slow
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally — force logout (but NOT on the login endpoint itself)
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const isLoginRequest = err.config?.url?.includes('/auth/login');
        if (err.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ─── Auth ───
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data),
    resetPassword: (data) => api.put('/auth/reset-password', data),
};

// ─── Users ───
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getOne: (id) => api.get(`/users/${id}`),
    updateRole: (id, data) => api.patch(`/users/${id}/role`, data),
    updateStatus: (id, data) => api.patch(`/users/${id}/status`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// ─── Assets ───
export const assetsAPI = {
    getAll: (params) => api.get('/assets', { params }),
    getOne: (id) => api.get(`/assets/${id}`),
    create: (data) => api.post('/assets', data),
    createBulk: (data) => api.post('/assets/bulk', data),
    checkSerials: (serials) => api.post('/assets/check-serials', { serials }),
    update: (id, data) => api.patch(`/assets/${id}`, data),
    updateStatus: (id, data) => api.patch(`/assets/${id}/status`, data),
    updateCondition: (id, data) => api.patch(`/assets/${id}/condition`, data),
    retire: (id) => api.patch(`/assets/${id}/retire`),
    migrateConditions: () => api.post('/assets/migrate-conditions'),
    delete: (id) => api.delete(`/assets/${id}`),
    getHistory: (id) => api.get(`/assets/${id}/history`),
};

// ─── Assignments ───
export const assignmentsAPI = {
    getAll: (params) => api.get('/assignments', { params }),
    getOne: (id) => api.get(`/assignments/${id}`),
    create: (data) => api.post('/assignments', data),
    requestReturn: (id) => api.post(`/assignments/${id}/return-request`),
    approveReturn: (id, data) => api.patch(`/assignments/${id}/approve-return`, data),
    reportLost: (id, data) => api.post(`/assignments/${id}/report-lost`, data),
    transfer: (id, data) => api.post(`/assignments/${id}/transfer`, data),
};

// ─── Exit Clearance ───
export const exitClearanceAPI = {
    getAll: (params) => api.get('/exit-clearance', { params }),
    getMe: () => api.get('/exit-clearance/me'),
    initiate: (data) => api.post('/exit-clearance', data),
    approve: (id, data) => api.patch(`/exit-clearance/${id}/approve`, data),
    reject: (id, data) => api.patch(`/exit-clearance/${id}/reject`, data),
};

// ─── Reports ───
export const reportsAPI = {
    getSummary: () => api.get('/reports/summary'),
    getDepartment: () => api.get('/reports/department'),
    getAuditLogs: (params) => api.get('/reports/audit-logs', { params }),
};

// ─── Asset Requests ───
export const assetRequestsAPI = {
    create: (data) => api.post('/asset-requests', data),
    getAll: (params) => api.get('/asset-requests', { params }),
    getOne: (id) => api.get(`/asset-requests/${id}`),
    approve: (id, data) => api.patch(`/asset-requests/${id}/approve`, data),
    reject: (id, data) => api.patch(`/asset-requests/${id}/reject`, data),
    assign: (id, data) => api.patch(`/asset-requests/${id}/assign`, data),
    markPurchase: (id, data) => api.patch(`/asset-requests/${id}/purchase`, data),
    getPendingCount: () => api.get('/asset-requests/pending-count'),
};

// ─── Notifications ───
export const notificationsAPI = {
    getAll: () => api.get('/notifications'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
};

// ─── Purchase Orders ───
export const purchaseOrdersAPI = {
    getAll: (params) => api.get('/purchase-orders', { params }),
    getOne: (id) => api.get(`/purchase-orders/${id}`),
    getCounts: () => api.get('/purchase-orders/counts'),
    create: (data) => api.post('/purchase-orders', data),
    updateStatus: (id, data) => api.patch(`/purchase-orders/${id}/status`, data),
    receiveAndAdd: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
    bulkReceive: (id, assets) => api.post(`/purchase-orders/${id}/bulk-receive`, { assets }),
    cancel: (id, data) => api.patch(`/purchase-orders/${id}/cancel`, data),
};

// ─── Maintenance ───
export const maintenanceAPI = {
    getAll: (params) => api.get('/maintenance', { params }),
    getByAsset: (assetId) => api.get(`/maintenance/asset/${assetId}`),
    create: (data) => api.post('/maintenance', data),
    updateStatus: (id, data) => api.patch(`/maintenance/${id}/status`, data),
};

// ─── Issues ───
export const issuesAPI = {
    reportIssue: (data) => api.post('/issues', data),
    getMyIssues: () => api.get('/issues/my'),
    getAll: () => api.get('/issues'),
    updateStatus: (id, data) => api.patch(`/issues/${id}/status`, data),
};

export default api;
