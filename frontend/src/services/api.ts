import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('led_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('led_auth_token');
      localStorage.removeItem('led_auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ==================== AUTH ====================
export const authApi = {
  login: (credentials: { email: string; password: string }) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (userData: any) => api.post('/auth/users', userData),
};

// ==================== PRODUCTS ====================
export const productApi = {
  getAll: (params?: { search?: string; status?: string }) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// ==================== MATERIALS ====================
export const materialApi = {
  getAll: (params?: { search?: string; category?: string; lowStock?: boolean }) =>
    api.get('/materials', { params }),
  getById: (id: string) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: string, data: any) => api.put(`/materials/${id}`, data),
  addStock: (id: string, data: { quantity: number; referenceNumber?: string; supplier?: string; notes?: string }) =>
    api.post(`/materials/${id}/add-stock`, data),
  adjustStock: (id: string, data: { newCurrentStock: number; reason?: string }) =>
    api.post(`/materials/${id}/adjust-stock`, data),
  getTransactions: (params?: { materialId?: string; type?: string; limit?: number }) =>
    api.get('/materials/transactions', { params }),
};

// ==================== BOM ====================
export const bomApi = {
  getAll: (params?: { productId?: string }) => api.get('/bom', { params }),
  getById: (id: string) => api.get(`/bom/${id}`),
  calculateRequirements: (productId: string, quantity: number) =>
    api.get(`/bom/calculate/${productId}`, { params: { quantity } }),
  create: (data: any) => api.post('/bom', data),
  update: (id: string, data: any) => api.put(`/bom/${id}`, data),
};

// ==================== PRODUCTION ORDERS ====================
export const productionOrderApi = {
  getAll: (params?: { status?: string; stage?: string; search?: string }) =>
    api.get('/production-orders', { params }),
  getById: (id: string) => api.get(`/production-orders/${id}`),
  create: (data: { productId: string; quantity: number; productionDate?: string; notes?: string }) =>
    api.post('/production-orders', data),
  lock: (id: string) => api.post(`/production-orders/${id}/lock`),
  cancel: (id: string) => api.post(`/production-orders/${id}/cancel`),
  updateStage: (id: string, data: { stage: string; notes?: string }) =>
    api.put(`/production-orders/${id}/stage`, data),
};

// ==================== QC TESTING ====================
export const qcApi = {
  getReports: (params?: { result?: string; search?: string }) => api.get('/qc/reports', { params }),
  getReportById: (id: string) => api.get(`/qc/reports/${id}`),
  createReport: (data: any) => api.post('/qc/reports', data),
  getCertificates: () => api.get('/qc/certificates'),
};

// ==================== FINISHED GOODS ====================
export const finishedGoodsApi = {
  getAll: (params?: { productId?: string; search?: string }) => api.get('/finished-goods', { params }),
  getStats: () => api.get('/finished-goods/stats'),
};

// ==================== DISPATCH ====================
export const dispatchApi = {
  getAll: (params?: { status?: string; search?: string }) => api.get('/dispatch', { params }),
  createOrder: (data: { customerName: string; invoiceNumber: string; productId: string; quantity: number; dispatchDate?: string }) =>
    api.post('/dispatch', data),
  completeDispatch: (id: string) => api.post(`/dispatch/${id}/complete`),
};

// ==================== DASHBOARD & REPORTS ====================
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const reportApi = {
  getAnalytics: () => api.get('/reports/analytics'),
};

// ==================== NOTIFICATIONS ====================
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ==================== AUDIT LOGS ====================
export const auditApi = {
  getAll: (params?: { module?: string; search?: string; limit?: number }) =>
    api.get('/audit-logs', { params }),
};
