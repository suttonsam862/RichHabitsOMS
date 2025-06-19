// This file is deprecated - use client/src/pages/dashboard/ManufacturerDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Navigate } from 'react-router-dom';

function ManufacturerDashboard() {
  return <Navigate to="/dashboard/manufacturer" replace />;
}

export default ManufacturerDashboard;