
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Import actual dashboard components
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import SalespersonDashboard from '@/pages/dashboard/SalespersonDashboard';
import DesignerDashboard from '@/pages/dashboard/DesignerDashboard';
import ManufacturerDashboard from '@/pages/dashboard/ManufacturerDashboard';
import CustomerDashboard from '@/pages/dashboard/CustomerDashboard';

export default function MainDashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-2 border-[#00d1ff] border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-sm"></div>
          </div>
          <div className="text-white/60 text-xs font-medium">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

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
