const BASE_URL = 'https://mahalatak-production.up.railway.app/api';

function getToken() {
  return localStorage.getItem('mahalak_token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'حدث خطأ غير متوقع');
  }
  return data;
}

async function uploadFile(path, file) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ غير متوقع');
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),
  updateProfile: (payload) => request('/auth/me', { method: 'PATCH', body: payload, auth: true }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload, auth: true }),
  getForgotPasswordQuestion: (phone) => request('/auth/forgot-password/question', { method: 'POST', body: { phone } }),
  resetForgotPassword: (payload) => request('/auth/forgot-password/reset', { method: 'POST', body: payload }),

  // Categories
  getCategories: (city) => request(`/categories${city ? `?city=${encodeURIComponent(city)}` : ''}`),

  // Locations
  getLocations: () => request('/locations'),

  // Upload
  uploadImage: (file) => uploadFile('/upload', file),

  // Stores
  getStores: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/stores${qs ? `?${qs}` : ''}`);
  },
  getStore: (id) => request(`/stores/${id}`),
  getStoreProducts: (id) => request(`/stores/${id}/products`),
  createStore: (payload) => request('/stores', { method: 'POST', body: payload, auth: true }),
  updateStore: (id, payload) => request(`/stores/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteStore: (id) => request(`/stores/${id}`, { method: 'DELETE', auth: true }),
  getMyStores: () => request('/stores/mine/list', { auth: true }),
  addProduct: (storeId, payload) => request(`/stores/${storeId}/products`, { method: 'POST', body: payload, auth: true }),
  updateProduct: (productId, payload) => request(`/stores/products/${productId}`, { method: 'PATCH', body: payload, auth: true }),
  deleteProduct: (productId) => request(`/stores/products/${productId}`, { method: 'DELETE', auth: true }),

  // Orders
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload, auth: true }),
  getMyOrders: () => request('/orders/mine', { auth: true }),
  getVendorOrders: () => request('/orders/vendor', { auth: true }),
  getVendorPendingCount: () => request('/orders/vendor/pending-count', { auth: true }),
  getOrder: (id) => request(`/orders/${id}`, { auth: true }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),
  submitReview: (orderId, payload) => request(`/orders/${orderId}/review`, { method: 'POST', body: payload, auth: true }),
  getStoreReviews: (storeId) => request(`/stores/${storeId}/reviews`),
  confirmPayment: (orderId) => request(`/orders/${orderId}/confirm-payment`, { method: 'PATCH', auth: true }),
  searchProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/stores/products-search${qs ? `?${qs}` : ''}`);
  },

  // إعدادات عامة (زي أرقام الدفع الإلكتروني)
  getPublicSettings: () => request('/settings/public'),

  // Delivery (مندوب)
  getAvailableDeliveries: (city) => request(`/orders/available-for-delivery${city ? `?city=${encodeURIComponent(city)}` : ''}`, { auth: true }),
  getMyDeliveries: () => request('/orders/delivery/mine', { auth: true }),
  claimOrder: (id) => request(`/orders/${id}/claim`, { method: 'POST', auth: true }),

  // Wallet (تاجر / مندوب)
  getMyWallet: () => request('/wallet/me', { auth: true }),
  getRates: () => request('/wallet/rates', { auth: true }),

  // Admin
  getAdminStats: () => request('/admin/stats', { auth: true }),
  getAdminUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`, { auth: true });
  },
  updateAdminUser: (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: payload, auth: true }),
  getAdminStores: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/stores${qs ? `?${qs}` : ''}`, { auth: true });
  },
  getAdminOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/orders${qs ? `?${qs}` : ''}`, { auth: true });
  },
  assignCourier: (orderId, courierId) => request(`/admin/orders/${orderId}/assign-courier`, { method: 'PATCH', body: { courier_id: courierId }, auth: true }),
  getAdminSettings: () => request('/admin/settings', { auth: true }),
  updateAdminSettings: (payload) => request('/admin/settings', { method: 'PATCH', body: payload, auth: true }),
  getAdminWallet: (userId) => request(`/admin/wallet/${userId}`, { auth: true }),
  settleWallet: (userId, payload) => request(`/admin/wallet/${userId}/settle`, { method: 'POST', body: payload, auth: true }),
  getAdminLocations: () => request('/admin/locations', { auth: true }),
  addAdminLocation: (payload) => request('/admin/locations', { method: 'POST', body: payload, auth: true }),
  deleteAdminLocation: (id) => request(`/admin/locations/${id}`, { method: 'DELETE', auth: true }),
  resetUserPassword: (userId, newPassword) => request(`/admin/users/${userId}/reset-password`, { method: 'POST', body: { newPassword }, auth: true }),
  getAdminCategories: () => request('/admin/categories', { auth: true }),
  addAdminCategory: (payload) => request('/admin/categories', { method: 'POST', body: payload, auth: true }),
  updateAdminCategory: (id, payload) => request(`/admin/categories/${id}`, { method: 'PATCH', body: payload, auth: true }),
  deleteAdminCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE', auth: true }),
};

export function saveToken(token) {
  localStorage.setItem('mahalak_token', token);
}
export function clearToken() {
  localStorage.removeItem('mahalak_token');
}
export { getToken };
