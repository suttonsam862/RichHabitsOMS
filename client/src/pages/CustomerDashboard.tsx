// This file is deprecated - use client/src/pages/dashboard/CustomerDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Navigate } from 'react-router-dom';

function CustomerDashboard() {
  return <Navigate to="/dashboard/customer" replace />;
}

export default CustomerDashboard;