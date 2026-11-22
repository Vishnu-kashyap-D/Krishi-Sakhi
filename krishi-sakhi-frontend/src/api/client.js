import axios from 'axios';
import { getToken, clearSession } from '../utils/auth';

// All requests go to /api (proxied to the backend by Vite in development).
// Set VITE_API_URL to call a backend on another origin, e.g. https://api.example.com/api
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired/invalid token on an authenticated request: log the user out.
    if (error.response?.status === 401 && getToken() && error.config?.headers?.Authorization) {
      clearSession();
    }
    return Promise.reject(error);
  }
);

// Turns an axios error into a message that can be shown to the user.
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.request && !error.response) {
    return 'Cannot reach the Krishi Sakhi server. Make sure the backend is running.';
  }
  // The Vite dev proxy answers with an empty 5xx when the backend is down.
  const res = error?.response;
  if (res && res.status >= 500 && (!res.data || typeof res.data === 'string')) {
    return 'Cannot reach the Krishi Sakhi server. Make sure the backend is running.';
  }
  return fallback;
};

export default apiClient;
