import axios from 'axios';
import { getToken, logoutUser } from './auth';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const SOCKET_BASE_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = getToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    if ((status === 401 || status === 403) && !isAuthRequest) {
      logoutUser(status === 403);
    }

    return Promise.reject(error);
  }
);

export default API;
