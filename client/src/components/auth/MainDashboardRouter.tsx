
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import SalespersonDashboard from '@/pages/dashboard/SalespersonDashboard';
import DesignerDashboard from '@/pages/dashboard/DesignerDashboard';
import ManufacturerDashboard from '@/pages/dashboard/ManufacturerDashboard';
import CustomerDashboard from '@/pages/dashboard/CustomerDashboard';

export default function MainDashboardRouter() {
  const { user, loading, initialized } = useAuth();

  // Show loading while auth is being checked
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'salesperson':
      return <SalespersonDashboard />;
    case 'designer':
      return <DesignerDashboard />;
    case 'manufacturer':
      return <ManufacturerDashboard />;
    case 'customer':
      return <CustomerDashboard />;
    default:
      console.warn('Unknown user role:', user.role);
      return <Navigate to="/login" replace />;
  }
}
