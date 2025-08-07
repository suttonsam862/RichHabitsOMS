
import React, { useEffect } from 'react';
import { Router, Route, Switch, Redirect, useLocation } from 'wouter';
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
import UserManagementPage from '@/pages/admin/UserManagementPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import SalesManagementPage from '@/pages/admin/SalesManagementPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import AdminManufacturerAssignment from '@/pages/AdminManufacturerAssignment';

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
import ProductDetail from '@/pages/ProductDetail';
import ProductCreatePage from '@/pages/ProductCreatePage';
import { NotFound } from '@/pages/not-found';

// Simple navigation interceptor
function NavigationInterceptor({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  useEffect(() => {
    // Simple route change logging without complex error handling
    console.log('Route changed to:', location.pathname);
  }, [location.pathname]);

  return <>{children}</>;
}

// Component to require authentication
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();

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

  return user ? <>{children}</> : <Redirect to="/login" />;
}

// Protected route wrapper that includes layout
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppLayout>
        {children}
      </AppLayout>
    </RequireAuth>
  );
}

// Dashboard router with role-based routing
function DashboardRouter() {
  return <MainDashboardRouter />;
}

export function AppRouter() {
  return (
    <Router>
      <NavigationInterceptor>
        <Switch>
          {/* Public routes */}
          <Route path="/login"><Login /></Route>
          <Route path="/register"><Register /></Route>
          <Route path="/setup-password"><SetupPassword /></Route>
          <Route path="/payment/success"><PaymentSuccess /></Route>
          <Route path="/payment/cancel"><PaymentCancel /></Route>

          {/* Protected routes - Dashboard */}
          <Route path="/dashboard/:rest*">
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Admin */}
          <Route path="/admin/customers/:id/edit">
            <ProtectedRoute>
              <CustomerEditPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/customers">
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/salespeople">
            <ProtectedRoute>
              <SalesManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/analytics">
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/user-management">
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/settings">
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Manufacturing */}
          <Route path="/manufacturer-assignment">
            <ProtectedRoute>
              <AdminManufacturerAssignment />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Customers */}
          <Route path="/customers/:id/edit">
            <ProtectedRoute>
              <CustomerEditPage />
            </ProtectedRoute>
          </Route>
          <Route path="/customers">
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Catalog */}
          <Route path="/catalog/:id/edit">
            <ProtectedRoute>
              <CatalogItemEditPage />
            </ProtectedRoute>
          </Route>
          <Route path="/catalog">
            <ProtectedRoute>
              <CatalogPage />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Products */}
          <Route path="/products/create">
            <ProtectedRoute>
              <ProductCreatePage />
            </ProtectedRoute>
          </Route>
          <Route path="/products/:id">
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Orders */}
          <Route path="/orders/create">
            <ProtectedRoute>
              <OrderCreatePage />
            </ProtectedRoute>
          </Route>
          <Route path="/orders/edit/:id">
            <ProtectedRoute>
              <OrderEditPage />
            </ProtectedRoute>
          </Route>
          <Route path="/orders/enhanced">
            <ProtectedRoute>
              <EnhancedOrderManagement />
            </ProtectedRoute>
          </Route>
          <Route path="/orders">
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Design and Production */}
          <Route path="/design-tasks">
            <ProtectedRoute>
              <DesignTasks />
            </ProtectedRoute>
          </Route>
          <Route path="/production">
            <ProtectedRoute>
              <Production />
            </ProtectedRoute>
          </Route>

          {/* Protected routes - Other */}
          <Route path="/messages">
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          </Route>
          <Route path="/payments">
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          </Route>

          {/* Root redirect */}
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>

          {/* 404 fallback */}
          <Route><NotFound /></Route>
        </Switch>
      </NavigationInterceptor>
    </Router>
  );
}
