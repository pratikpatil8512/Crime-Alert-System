// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, getUserRole } from '../utils/auth';

/**
 * Protects routes by verifying login and role-based access.
 * Supports both single-role and multi-role access (e.g., admin/police).
 */
export default function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const token = getToken();
  const role = getUserRole();

  // 🔒 No token = go to login
  if (!token) {
    console.warn('🚫 Unauthorized: Missing or expired token.');
    return <Navigate to="/login" replace />;
  }

  // ✅ Handle multiple roles (admin, police)
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(`❌ Access denied. Role '${role}' not in allowed roles: ${allowedRoles.join(', ')}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Handle single requiredRole (for other routes)
  if (requiredRole && role !== requiredRole) {
    console.warn(`❌ Unauthorized role. Expected: ${requiredRole}, Found: ${role}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Access granted
  return children;
}
