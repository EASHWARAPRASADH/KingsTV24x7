import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return import.meta.env.VITE_API_BASE || 'http://localhost:8085/api/v1';
  }
  if (import.meta.env.VITE_API_BASE && !import.meta.env.VITE_API_BASE.includes('localhost')) {
    return import.meta.env.VITE_API_BASE;
  }
  return 'https://kings-tv.onrender.com/api/v1';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add auth token and fix FormData headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Auto-detect FormData to fix file uploads globally (removes explicit Content-Type to let Axios set the boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global errors (e.g. 401 Unauthorized / 403 Forbidden)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Exempt /auth/login requests from auto-redirect so login page can display error messages
    if (error.config && error.config.url && error.config.url.includes('/auth/login')) {
      return Promise.reject(error);
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('user');
      localStorage.removeItem('active_role_override');
      const isSubpath = window.location.pathname.includes('/king-tv');
      window.location.href = isSubpath ? '/king-tv/admin/login' : '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default api;
