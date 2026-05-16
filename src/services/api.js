import axios from 'axios';

// In dev the React proxy (package.json "proxy") forwards /api/* to Django.
// In production (Vercel + Railway split deployment) REACT_APP_BACKEND_URL must
// be set to the Railway backend URL so requests go to the correct origin.
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true, // send httpOnly refresh_token cookie on every request
  headers: { Accept: 'application/json' },
});

// Access token lives only in memory — never touches localStorage or cookies.
let _accessToken = null;

export function setAccessToken(token) {
  _accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function clearAccessToken() {
  setAccessToken(null);
}

// Injected by AuthContext so the interceptor can trigger logout on hard failure.
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
}

// Always use the in-memory token (not localStorage) for every request.
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatic silent refresh on 401.
let _isRefreshing = false;
let _pendingQueue = [];

function drainQueue(error, token) {
  _pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  _pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const httpStatus = error?.response?.status;
    const originalRequest = error.config;

    // Skip refresh loop for the refresh endpoint itself or already-retried requests.
    const isRefreshEndpoint = originalRequest?.url?.includes('token-refresh');
    if (httpStatus === 401 && !originalRequest?._retry && !isRefreshEndpoint) {
      if (_isRefreshing) {
        // Queue the request until the in-flight refresh resolves.
        return new Promise((resolve, reject) => {
          _pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      _isRefreshing = true;

      try {
        const res = await api.post('/auth/token-refresh/');
        const newToken = res.data.access;
        setAccessToken(newToken);
        drainQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        drainQueue(refreshError, null);
        clearAccessToken();
        if (typeof _onUnauthorized === 'function') _onUnauthorized();
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
