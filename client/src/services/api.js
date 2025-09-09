import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          if (response.data.success) {
            const { token, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', newRefreshToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const businessProfileAPI = {
  get: () => api.get('/business-profile'),
  create: (data) => api.post('/business-profile', data),
  update: (data) => api.post('/business-profile', data),
  getIndianStates: () => api.get('/business-profile/states/india'),
  validateGSTIN: (gstin) => api.post('/business-profile/validate-gstin', { gstin }),
  uploadLogo: (logoUrl) => api.post('/business-profile/logo', { logoUrl }),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  addMaterial: (id, data) => api.post(`/products/${id}/materials`, data),
  addJobWork: (id, data) => api.post(`/products/${id}/job-work`, data),
  addAdditionalCost: (id, data) => api.post(`/products/${id}/additional-costs`, data),
};

export const overheadsAPI = {
  getAll: (params) => api.get('/overheads', { params }),
  getById: (id) => api.get(`/overheads/${id}`),
  create: (data) => api.post('/overheads', data),
  update: (id, data) => api.put(`/overheads/${id}`, data),
  delete: (id) => api.delete(`/overheads/${id}`),
  getAnalytics: (params) => api.get('/overheads/analytics', { params }),
  uploadReceipt: (id, receiptUrl) => api.post(`/overheads/${id}/receipt`, { receiptUrl }),
};

export const stockAPI = {
  getMovements: (productId, params) => api.get(`/stock/movements/${productId}`, { params }),
  addMovement: (data) => api.post('/stock/movements', data),
  getSales: (productId, params) => api.get(`/stock/sales/${productId}`, { params }),
  recordSale: (data) => api.post('/stock/sales', data),
  getLowStockAlerts: (params) => api.get('/stock/alerts/low-stock', { params }),
  getSummary: () => api.get('/stock/summary'),
};

export const reportsAPI = {
  getProductCost: (productId, format) => api.get(`/reports/product-cost/${productId}`, { 
    params: { format } 
  }),
  getOverheads: (params) => api.get('/reports/overheads', { params }),
  getProfitability: (params) => api.get('/reports/profitability', { params }),
};

export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getTrends: (params) => api.get('/dashboard/trends', { params }),
  getQuickStats: () => api.get('/dashboard/quick-stats'),
};

export const uploadAPI = {
  upload: (formData, multiple = false) => {
    const endpoint = multiple ? '/upload/multiple' : '/upload/single';
    return api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadLogo: (formData) => api.post('/upload/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  uploadReceipt: (formData) => api.post('/upload/receipt', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (key) => api.delete(`/upload/${encodeURIComponent(key)}`),
};

export default api;
