import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const publicPaths = ['/grievances', '/auth'];
      const isPublic = publicPaths.some(p => err.config?.url?.includes(p));
      if (!isPublic) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  govLogin: (data) => api.post('/auth/gov-login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const grievanceAPI = {
  submit: (data) => api.post('/grievances', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (params) => api.get('/grievances', { params }),
  getById: (id) => api.get(`/grievances/${id}`),
  updateStatus: (id, data) => api.patch(`/grievances/${id}/status`, data),
  assign: (id, data) => api.patch(`/grievances/${id}/assign`, data),
  addNote: (id, data) => api.post(`/grievances/${id}/notes`, data),
  upvote: (id) => api.post(`/grievances/${id}/upvote`),
  delete: (id) => api.delete(`/grievances/${id}`),
};

export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  officers: () => api.get('/admin/officers'),
  export: () => api.get('/admin/export', { responseType: 'blob' }),
};

export const aiAPI = {
  suggest: (grievance) => api.post('/ai/suggest', { grievance }),
  classify: (description) => api.post('/ai/classify', { description }),
  detectIssue: (data) => api.post('/ai/detect-issue', data),
  summarize: (data) => api.post('/ai/summarize', data),
};

export const nlpAPI = {
  geocode: (text) => api.post('/nlp/geocode', { text }),
  triage: (text, subject = '') => api.post('/nlp/triage', { text, subject }),
};

export const mapAPI = {
  getMapData: () => api.get('/grievances/map-data'),
};

export const analyticsAPI = {
  getHeatmapData: (params) => api.get('/analytics/heatmap', { params }),
  getLocations: () => api.get('/analytics/locations'),
};

export default api;
