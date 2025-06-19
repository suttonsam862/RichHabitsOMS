// This file is deprecated - use client/src/pages/dashboard/AdminDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Navigate } from 'react-router-dom';

function AdminDashboard() {
  return <Navigate to="/dashboard/admin" replace />;
}

export default AdminDashboard;