// This file is deprecated - use client/src/pages/dashboard/DesignerDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Navigate } from 'react-router-dom';

function DesignerDashboard() {
  return <Navigate to="/dashboard/designer" replace />;
}

export default DesignerDashboard;