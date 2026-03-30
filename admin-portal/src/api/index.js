import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Attach admin JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const isLoginRequest = err.config?.url?.includes('/admin/login');
        if (err.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/';
        }
        return Promise.reject(err);
    }
);

export const adminAPI = {
    login: (data) => api.post('/admin/login', data),
    createEmployee: (data) => api.post('/admin/employees', data),
    getEmployees: () => api.get('/admin/employees'),
    deleteEmployee: (id) => api.delete(`/admin/employees/${id}`),
};

export default api;
