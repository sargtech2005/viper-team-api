import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-handle 401 → redirect to login
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Typed helpers ─────────────────────────────────────────────────────────────
export const authApi = {
  register: (d: { name: string; email: string; password: string; recaptchaToken?: string }) =>
    api.post('/auth/register', d),
  login:    (d: { email: string; password: string }) => api.post('/auth/login', d),
  logout:   () => api.post('/auth/logout'),
  me:       () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const userApi = {
  profile:       () => api.get('/user/profile'),
  updateProfile: (d: { name: string }) => api.put('/user/profile', d),
  regenerateKey: () => api.post('/user/regenerate-key'),
  usage:         () => api.get('/user/usage'),
  billing:       () => api.get('/user/billing'),
};

export const paymentApi = {
  subscribe:   (plan: string) => api.post('/payment/subscribe', { plan }),
  buyCredits:  (pack: string) => api.post('/payment/buy-credits', { pack }),
  verify:      (ref: string)  => api.get(`/payment/verify/${ref}`),
};

export const adminApi = {
  stats:            () => api.get('/admin/stats'),
  users:            (p?: object) => api.get('/admin/users', { params: p }),
  user:             (id: number) => api.get(`/admin/users/${id}`),
  updateUser:       (id: number, d: object) => api.patch(`/admin/users/${id}`, d),
  payments:         () => api.get('/admin/payments'),
  creditPurchases:  () => api.get('/admin/credit-purchases'),
  categories:       () => api.get('/admin/categories'),
  createCategory:   (d: object) => api.post('/admin/categories', d),
  updateCategory:   (id: number, d: object) => api.patch(`/admin/categories/${id}`, d),
  endpoints:        (catId?: number) => api.get('/admin/endpoints', { params: catId ? { category_id: catId } : {} }),
  createEndpoint:   (d: object) => api.post('/admin/endpoints', d),
  updateEndpoint:   (id: number, d: object) => api.patch(`/admin/endpoints/${id}`, d),
  settings:         () => api.get('/admin/settings'),
  saveSettings:     (d: object) => api.put('/admin/settings', d),
  logs:             (limit?: number) => api.get('/admin/logs', { params: { limit } }),
};
