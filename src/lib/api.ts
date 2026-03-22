import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
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
