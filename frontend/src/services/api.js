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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/me', userData),
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deactivateUser: (id) => api.put(`/users/${id}/deactivate`),
  activateUser: (id) => api.put(`/users/${id}/activate`),
  getUserStats: (id) => api.get(`/users/${id}/stats`),
  getUserNotifications: (id, params) => api.get(`/users/${id}/notifications`, { params }),
  markNotificationRead: (userId, notificationId) => 
    api.put(`/users/${userId}/notifications/${notificationId}/read`),
};

// Products API
export const productsAPI = {
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getSellerProducts: (sellerId, params) => api.get(`/products/seller/${sellerId}`, { params }),
  toggleFeatured: (id, isFeatured) => api.put(`/products/${id}/featured`, { isFeatured }),
  getProductStats: (id) => api.get(`/products/${id}/stats`),
};

// Categories API
export const categoriesAPI = {
  getCategories: (params) => api.get('/categories', { params }),
  getCategory: (id) => api.get(`/categories/${id}`),
  createCategory: (categoryData) => api.post('/categories', categoryData),
  updateCategory: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  getCategoryTree: () => api.get('/categories/tree/structure'),
  getCategoryStats: (id) => api.get(`/categories/${id}/stats`),
};

// Transactions API
export const transactionsAPI = {
  getTransactions: (params) => api.get('/transactions', { params }),
  getMyTransactions: (params) => api.get('/transactions/my-transactions', { params }),
  getTransaction: (id) => api.get(`/transactions/${id}`),
  createTransaction: (transactionData) => api.post('/transactions', transactionData),
  updateTransactionStatus: (id, status, notes) => 
    api.put(`/transactions/${id}/status`, { status, notes }),
  addTrackingNumber: (id, trackingNumber) => 
    api.put(`/transactions/${id}/tracking`, { trackingNumber }),
  getTransactionStats: () => api.get('/transactions/stats/overview'),
};

// Disputes API
export const disputesAPI = {
  getDisputes: (params) => api.get('/disputes', { params }),
  getMyDisputes: (params) => api.get('/disputes/my-disputes', { params }),
  getDispute: (id) => api.get(`/disputes/${id}`),
  createDispute: (disputeData) => api.post('/disputes', disputeData),
  addDisputeMessage: (id, message, attachments) => 
    api.post(`/disputes/${id}/messages`, { message, attachments }),
  assignDispute: (id, assignedAdminId) => 
    api.put(`/disputes/${id}/assign`, { assignedAdminId }),
  resolveDispute: (id, resolution, refundAmount, refundToBuyer) => 
    api.put(`/disputes/${id}/resolve`, { resolution, refundAmount, refundToBuyer }),
  getDisputeStats: () => api.get('/disputes/stats/overview'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', { settings }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  promoteUser: (id, role) => api.put(`/admin/users/${id}/promote`, { role }),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
};

// Reviews API
export const reviewsAPI = {
  createReview: (reviewData) => api.post('/reviews', reviewData),
  getReviews: (params) => api.get('/reviews', { params }),
  updateReview: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};

export default api;