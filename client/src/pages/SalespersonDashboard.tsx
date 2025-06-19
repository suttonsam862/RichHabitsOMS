// This file is deprecated - use client/src/pages/dashboard/SalespersonDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Navigate } from 'react-router-dom';

function SalespersonDashboard() {
  return <Navigate to="/dashboard/salesperson" replace />;
}

export default SalespersonDashboard;