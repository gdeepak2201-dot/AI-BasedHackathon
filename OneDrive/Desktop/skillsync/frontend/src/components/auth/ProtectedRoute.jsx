import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    const dashboardMap = { admin: '/admin', manager: '/manager', employee: '/dashboard' };
    return <Navigate to={dashboardMap[user?.role] || '/dashboard'} replace />;
  }

  return children;
}
