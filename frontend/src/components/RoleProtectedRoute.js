import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '../utils/auth';

export default function RoleProtectedRoute({ children, allowedRoles }) {
  const isAuth = isAuthenticated();
  const role = getUserRole();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
