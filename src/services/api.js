/* src/services/api.js
   Improved axios wrapper for PKFe-Hub frontend.
   - Consistent env var: REACT_APP_API_URL
   - Export helpers: setAuthToken, clearAuthToken, setUnauthorizedHandler
   - Response interceptor calls an injected onUnauthorized handler instead of directly redirecting.
   - Includes timeout and optional withCredentials for cookie-based auth.
*/

import axios from 'axios';

// Use a single env variable name across the app
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with sensible defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000, // 30s timeout for requests
  // If using cookie-based (Django session) auth, enable withCredentials
  // withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

// Internal handler the app can provide (e.g., from AuthContext)
let onUnauthorizedHandler = null;

/**
 * Set the token used for Authorization header.
 * Call this after login to ensure future requests include the token.
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      localStorage.setItem('token', token);
    } catch (e) {
      // ignore storage errors (e.g., private mode)
    }
  }
}

/** Clear auth from axios defaults and localStorage */
export function clearAuthToken() {
  delete api.defaults.headers.common['Authorization'];
  try {
    localStorage.removeItem('token');
  } catch (e) {}
}

/** Allow app to inject a handler for 401 (logout/refresh/redirect) */
export function setUnauthorizedHandler(fn) {
  onUnauthorizedHandler = fn;
}

/** Helper: get token from storage (used in request interceptor) */
function getStoredToken() {
  try {
    return localStorage.getItem('token');
  } catch (e) {
    return null;
  }
}

// Request interceptor: always read token at request time (keeps multi-tab sync)
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if (config.headers) delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 centrally
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    // If 401: attempt a refresh (optional) then call onUnauthorizedHandler
    if (status === 401) {
      // Option 1: Try refresh token flow (placeholder)
      // if (!isRefreshing) { ... refresh logic here ... }
      // For now: call injected handler if present, otherwise clear token and fallback to redirect
      if (typeof onUnauthorizedHandler === 'function') {
        try {
          await onUnauthorizedHandler(error);
        } catch (handlerErr) {
          // If handler fails or chooses to not recover, fall through to default
        }
        return Promise.reject(error);
      }

      // Default fallback (legacy behavior): clear token and redirect to login
      try { localStorage.removeItem('token'); } catch (e) {}
      // Navigating from inside services isn't recommended for testability, but keep as fallback:
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }

    // Optionally handle 5xx with retry logic here (axios-retry can be used)
    return Promise.reject(error);
  }
);

export default api;