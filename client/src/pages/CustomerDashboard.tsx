// This file is deprecated - use client/src/pages/dashboard/CustomerDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Redirect } from 'wouter';

function CustomerDashboard() {
  return <Redirect to="/dashboard/customer" />;
}

export default CustomerDashboard;