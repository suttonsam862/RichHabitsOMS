import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

// Auth components
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import SetupPassword from '@/pages/SetupPassword';

// Layout components
import { AppLayout } from '@/components/layout/AppLayout';
import MainDashboardRouter from '@/components/auth/MainDashboardRouter';

// Dashboard components
import AdminDashboard from '@/pages/AdminDashboard';
import SalespersonDashboard from '@/pages/SalespersonDashboard';
import DesignerDashboard from '@/pages/DesignerDashboard';
import ManufacturerDashboard from '@/pages/ManufacturerDashboard';
import CustomerDashboard from '@/pages/CustomerDashboard';

// Admin pages
import CustomerListPage from '@/pages/admin/CustomerListPage';
import CustomerEditPage from '@/pages/admin/CustomerEditPage';
import CatalogPage from '@/pages/admin/CatalogPage';
import CatalogItemEditPage from '@/pages/admin/CatalogItemEditPage';
import UserPermissionsPage from '@/pages/admin/UserPermissionsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import SalesManagementPage from '@/pages/admin/SalesManagementPage';

// Order pages
import Orders from '@/pages/Orders';
import OrderEditPage from '@/pages/OrderEditPage';
import OrderCreatePage from '@/pages/orders/OrderCreatePage';
import EnhancedOrderManagement from '@/pages/orders/EnhancedOrderManagement';

// Other pages
import DesignTasks from '@/pages/DesignTasks';
import Production from '@/pages/Production';
import Messages from '@/pages/Messages';
import Payments from '@/pages/Payments';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCancel from '@/pages/PaymentCancel';
import { NotFound } from '@/pages/not-found';

// Component to require authentication
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();

  // Fast loading state - only show while authentication is initializing
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-2 border-[#00d1ff] border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-sm"></div>
          </div>
          <div className="text-white/60 text-xs font-medium">
            Authenticating...
          </div>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/setup-password" element={<SetupPassword />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />

        {/* Protected routes */}
        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          {/* Dashboard routing */}
          <Route path="dashboard" element={<MainDashboardRouter />} />
          <Route path="dashboard/admin" element={<AdminDashboard />} />
          <Route path="dashboard/salesperson" element={<SalespersonDashboard />} />
          <Route path="dashboard/designer" element={<DesignerDashboard />} />
          <Route path="dashboard/manufacturer" element={<ManufacturerDashboard />} />
          <Route path="dashboard/customer" element={<CustomerDashboard />} />

          {/* Admin routes */}
          <Route path="admin/customers" element={<CustomerListPage />} />
          <Route path="admin/customers/:id/edit" element={<CustomerEditPage />} />
          {/* Salesperson Management route */}
          <Route path="admin/salespeople" element={<SalesManagementPage />} />

          {/* Customer management routes */}
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/:id/edit" element={<CustomerEditPage />} />

          {/* Catalog management routes */}
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="catalog/:id/edit" element={<CatalogItemEditPage />} />

          {/* Order routes */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/create" element={<OrderCreatePage />} />
          <Route path="orders/edit/:id" element={<OrderEditPage />} />
          <Route path="orders/enhanced" element={<EnhancedOrderManagement />} />

          {/* Design and production routes */}
          <Route path="design-tasks" element={<DesignTasks />} />
          <Route path="production" element={<Production />} />

          {/* Other routes */}
          <Route path="messages" element={<Messages />} />
          <Route path="payments" element={<Payments />} />

          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}