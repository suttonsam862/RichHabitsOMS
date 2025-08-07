// This file is deprecated - use client/src/pages/dashboard/SalespersonDashboard.tsx instead
// Redirecting to the consolidated dashboard
import { Redirect } from 'wouter';

function SalespersonDashboard() {
  return <Redirect to="/dashboard/salesperson" />;
}

export default SalespersonDashboard;