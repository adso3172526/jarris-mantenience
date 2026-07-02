import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar token expirado (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirigir al login solo si no estamos ya en login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  resetPassword: (id: string, newPassword: string) => 
    api.patch(`/users/${id}/reset-password`, { newPassword }),
  getTechniciansAndContractors: () => api.get('/users/technicians-contractors/list'),
};

// Categories
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.patch(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Locative Categories
export const locativeCategoriesApi = {
  getAll: () => api.get('/locative-categories'),
  getActive: () => api.get('/locative-categories/active'),
  create: (data: any) => api.post('/locative-categories', data),
  update: (id: string, data: any) => api.patch(`/locative-categories/${id}`, data),
};

// Locations
export const locationsApi = {
  getAll: () => api.get('/locations'),
  getById: (id: string) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: string, data: any) => api.patch(`/locations/${id}`, data),
  getExpenses: (id: string) => api.get(`/locations/${id}/expenses`),
  delete: (id: string) => api.delete(`/locations/${id}`),
};


// Assets
export const assetsApi = {
  getAll: () => api.get('/assets'),
  getById: (id: string) => api.get(`/assets/${id}`),
  create: (data: any) => api.post('/assets', data),
  update: (id: string, data: any) => api.patch(`/assets/${id}`, data),
  deactivate: (id: string, data: { createdBy?: string; description?: string }) =>
    api.patch(`/assets/${id}/deactivate`, data),
  reactivate: (id: string, data: { createdBy?: string; description?: string }) =>
    api.patch(`/assets/${id}/reactivate`, data),
  transfer: (id: string, data: any) => api.post(`/assets/${id}/transfer`, data),
  getByCode: (code: string) => api.get(`/assets/code/${code}`),
  getByLocation: (locationId: string) => api.get(`/assets/location/${locationId}`),
  getQR: (id: string) => api.get(`/assets/${id}/qr`),

  // Carga masiva
  downloadTemplate: () =>
    api.get('/assets/import/template', { responseType: 'blob' }),
  importExcel: (formData: FormData) =>
    api.post('/assets/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // ? Obtener gastos por ubicación
  getLocationExpenses: (assetId: string) => api.get(`/assets/${assetId}/location-expenses`),
  
  // Fotos
  uploadPhotos: (assetId: string, formData: FormData) =>
    api.post(`/assets/${assetId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (assetId: string, photoIndex: number) =>
    api.delete(`/assets/${assetId}/photos/${photoIndex}`),
};

// Work Orders
export const workOrdersApi = {
  getAll: () => api.get('/work-orders'),
  getById: (id: string) => api.get(`/work-orders/${id}`),
  getByAsset: (assetId: string) => api.get(`/work-orders/by-asset/${assetId}`),
  getByAssignee: (email: string) => api.get(`/work-orders/by-assignee?email=${email}`),
  getByCreator: (email: string) => api.get(`/work-orders/by-creator?email=${email}`),
  getByLocation: (locationId: string) => api.get(`/work-orders/by-location/${locationId}`),
  getByStatus: (status: string) => api.get(`/work-orders/by-status/${status}`),
  create: (data: any) => api.post('/work-orders', data),
  assign: (id: string, data: any) => api.patch(`/work-orders/${id}/assign`, data),
  reject: (id: string, data: any) => api.patch(`/work-orders/${id}/reject`, data),
  reassign: (id: string, data: any) => api.patch(`/work-orders/${id}/reassign`, data),
  start: (id: string, data: any) => api.patch(`/work-orders/${id}/start`, data),
  finish: (id: string, data: any) => api.patch(`/work-orders/${id}/finish`, data),
  close: (id: string, data: any) => api.patch(`/work-orders/${id}/close`, data),
  editClosed: (id: string, data: any) => api.patch(`/work-orders/${id}/edit-closed`, data),
  changeAsset: (id: string, assetId: string) => api.patch(`/work-orders/${id}/change-asset`, { assetId }),
  changeLocation: (id: string, locationId: string) => api.patch(`/work-orders/${id}/change-location`, { locationId }),

  // Fotos
  uploadPhotos: (id: string, formData: FormData) =>
    api.post(`/work-orders/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // Factura
  uploadInvoice: (id: string, formData: FormData) =>
    api.post(`/work-orders/${id}/invoice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Reemplazar (para edición de OT cerradas)
  replaceInvoice: (id: string, formData: FormData) =>
    api.post(`/work-orders/${id}/replace-invoice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  replacePhotos: (id: string, formData: FormData) =>
    api.post(`/work-orders/${id}/replace-photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Reports
export const reportsApi = {
  // ? Dashboard (actualizado)
  getDashboard: (params: {
    fechaDesde: string;
    fechaHasta: string;
    ubicacionId?: string;
  }) => api.get('/reports/dashboard', { params }),

  // ? Descargar Excel (nuevo)
  downloadExcel: (params: { fechaDesde: string; fechaHasta: string }) =>
    api.get('/reports/excel/download', {
      params,
      responseType: 'blob',
    }),

  // ? Descargar Excel de Inventario de Activos
  downloadAssetsExcel: () =>
    api.get('/reports/excel/assets-download', {
      responseType: 'blob',
    }),

  // ? Métodos existentes
  getMaintenanceCostsByLocation: () =>
    api.get('/reports/maintenance-costs-by-location'),
  
  getMaintenanceCostsByCategory: () =>
    api.get('/reports/maintenance-costs-by-category'),
  
  getAssetsByLocation: () => 
    api.get('/reports/assets-by-location'),
  
  getAssetsByCategory: () => 
    api.get('/reports/assets-by-category'),
  
  getWorkOrdersByStatus: () => 
    api.get('/reports/work-orders-by-status'),
  
  getTopMaintenanceAssets: (limit?: number) => 
    api.get(`/reports/top-maintenance-assets${limit ? `?limit=${limit}` : ''}`),
};

// Profiles
export const profilesApi = {
  getAll: () => api.get('/profiles'),
  getById: (id: string) => api.get(`/profiles/${id}`),
  create: (data: any) => api.post('/profiles', data),
  update: (id: string, data: any) => api.patch(`/profiles/${id}`, data),
  delete: (id: string) => api.delete(`/profiles/${id}`),
  listPermissions: () => api.get('/profiles/permissions/list'),
};

// Warehouse
export const warehouseApi = {
  // Warehouses
  getAll: () => api.get('/warehouse'),
  getById: (id: string) => api.get(`/warehouse/${id}`),
  getByLocation: (locationId: string) => api.get(`/warehouse/by-location/${locationId}`),
  create: (data: any) => api.post('/warehouse', data),
  update: (id: string, data: any) => api.patch(`/warehouse/${id}`, data),

  // Items
  getItems: (warehouseId: string) => api.get(`/warehouse/${warehouseId}/items`),
  getItemById: (id: string) => api.get(`/warehouse/items/${id}`),
  createItem: (data: any) => api.post('/warehouse/items', data),
  updateItem: (id: string, data: any) => api.patch(`/warehouse/items/${id}`, data),
  getLowStockItems: () => api.get('/warehouse/items/low-stock'),

  // Stock
  addStockEntry: (data: any) => api.post('/warehouse/stock-entry', data),

  // Transfers
  createTransfer: (data: any) => api.post('/warehouse/transfers', data),

  // Consumption
  consumeItems: (data: any) => api.post('/warehouse/consume', data),
  getConsumption: (workOrderId: string) => api.get(`/warehouse/consumption/${workOrderId}`),
  updateConsumption: (workOrderId: string, data: any) => api.put(`/warehouse/consumption/${workOrderId}`, data),

  // Movements (Kardex)
  getMovements: (params?: any) => api.get('/warehouse/movements', { params }),
};

// Asset Events
export const assetEventsApi = {
  getAll: () => api.get('/asset-events'),
  getByAsset: (assetId: string) => api.get(`/asset-events/asset/${assetId}`),
  editTransfer: (id: string, data: any) => api.patch(`/asset-events/${id}/edit`, data),
  voidTransfer: (id: string, data: any) => api.patch(`/asset-events/${id}/void`, data),
};

export default api;