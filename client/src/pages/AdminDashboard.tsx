// This file is deprecated - use client/src/pages/dashboard/AdminDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Redirect } from 'wouter';

function AdminDashboard() {
  return <Redirect to="/dashboard/admin" />;
}

export default AdminDashboard;