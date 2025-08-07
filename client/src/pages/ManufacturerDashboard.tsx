// This file is deprecated - use client/src/pages/dashboard/ManufacturerDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Redirect } from 'wouter';

function ManufacturerDashboard() {
  return <Redirect to="/dashboard/manufacturer" />;
}

export default ManufacturerDashboard;