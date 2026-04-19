// src/utils/auth.js
import {jwtDecode} from 'jwt-decode';

// ✅ Safely retrieve and validate token
export const getToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // convert ms → seconds

    if (decoded.exp && decoded.exp < currentTime) {
      console.warn('⏰ JWT expired. Logging out automatically...');
      logoutUser(true); // auto logout if expired
      return null;
    }

    return token;
  } catch (err) {
    console.error('❌ Invalid token:', err);
    logoutUser(true);
    return null;
  }
};

// ✅ Get user role (defaults to guest)
export const getUserRole = () => {
  const role = localStorage.getItem('role');
  return role || 'guest';
};

// ✅ Get user name (defaults to Guest)
export const getUserName = () => {
  const name = localStorage.getItem('name');
  return name || 'Guest';
};

// ✅ Logout (manual or auto)
export const logoutUser = (isAuto = false) => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('name');

  if (isAuto) {
    // Add a flag so login page can show a friendly notice
    localStorage.setItem('sessionExpired', 'true');
  }

  // Force navigation to login page
  window.location.href = '/login';
};
