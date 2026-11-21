import axios from 'axios';

const defaultUrl = new URL('/api', window.location.origin);
defaultUrl.port = '5000';
const endpoint = new URL(import.meta.env.VITE_API_URL?.trim() || defaultUrl.href, window.location.origin);
const api = axios.create({
  baseURL: endpoint.href.replace(/\/+$/, ''),
});

// Tự động gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nếu tài khoản đang đăng nhập bị khóa thì đăng xuất ngay
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.data?.locked) {
      const reason = error.response.data.reason;
      localStorage.clear();
      alert(`Tài khoản của bạn đã bị khóa.${reason ? ` Lý do: ${reason}` : ''}`);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
