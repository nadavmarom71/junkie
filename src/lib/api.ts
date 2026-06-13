import axios from 'axios';

// Always call the API on the SAME origin as the frontend.
// In prod, Vercel rewrites /api/* to the backend (see vercel.json); in dev,
// Vite proxies /api to localhost:3001 (see vite.config.ts). This keeps the
// session cookie first-party so mobile browsers (which block third-party
// cookies) accept it. Do NOT point this at the cross-origin backend URL.
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send httpOnly session cookie on every request
  timeout: 20000,
});

// Response interceptor — unwrap .data and convert errors to readable messages
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      'שגיאה לא ידועה';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
