import { Router, Route, Switch, Redirect } from "wouter";
import { useAuth } from '@/hooks/use-auth';
import { Suspense } from 'react';

// Auth components
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import SetupPassword from '@/pages/SetupPassword';

// Layout components
import { AppLayout } from '@/components/layout/AppLayout';

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

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <div className="animate-spin w-8 h-8 border-2 border-[#00d1ff] border-t-transparent rounded-full"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-sm"></div>
        </div>
        <div className="text-white/60 text-xs font-medium">
          Loading...
        </div>
      </div>
    </div>
  );
}

// Component to require authentication
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();

  // Show loading state while authentication is initializing
  if (!initialized || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Protected route wrapper with layout
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppLayout>
        {children}
      </AppLayout>
    </RequireAuth>
  );
}

// Dashboard router based on user role
function DashboardRouter() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }

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
      return <CustomerDashboard />;
  }
}

export function AppRouter() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          {/* Public routes */}
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/setup-password" component={SetupPassword} />
          
          {/* Protected routes */}
          <Route path="/dashboard">
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          </Route>

          {/* Admin routes */}
          <Route path="/customers">
            <ProtectedRoute>
              <CustomerListPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/customers/:id">
            <ProtectedRoute>
              <CustomerEditPage />
            </ProtectedRoute>
          </Route>

          <Route path="/catalog">
            <ProtectedRoute>
              <CatalogPage />
            </ProtectedRoute>
          </Route>

          <Route path="/catalog/:id">
            <ProtectedRoute>
              <CatalogItemEditPage />
            </ProtectedRoute>
          </Route>

          <Route path="/admin/user-permissions">
            <ProtectedRoute>
              <UserPermissionsPage />
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

          <Route path="/admin/sales-management">
            <ProtectedRoute>
              <SalesManagementPage />
            </ProtectedRoute>
          </Route>

          <Route path="/admin/analytics">
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          </Route>

          <Route path="/admin/manufacturer-assignment">
            <ProtectedRoute>
              <AdminManufacturerAssignment />
            </ProtectedRoute>
          </Route>

          {/* Order routes */}
          <Route path="/orders">
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          </Route>

          <Route path="/orders/create">
            <ProtectedRoute>
              <OrderCreatePage />
            </ProtectedRoute>
          </Route>

          <Route path="/orders/:id">
            <ProtectedRoute>
              <OrderEditPage />
            </ProtectedRoute>
          </Route>

          <Route path="/orders/enhanced-management">
            <ProtectedRoute>
              <EnhancedOrderManagement />
            </ProtectedRoute>
          </Route>

          {/* Other protected routes */}
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

          <Route path="/manufacturing">
            <ProtectedRoute>
              <Production />
            </ProtectedRoute>
          </Route>

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

          <Route path="/payment-success">
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          </Route>

          <Route path="/payment-cancel">
            <ProtectedRoute>
              <PaymentCancel />
            </ProtectedRoute>
          </Route>

          <Route path="/products/:id">
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          </Route>

          <Route path="/products/create">
            <ProtectedRoute>
              <ProductCreatePage />
            </ProtectedRoute>
          </Route>

          {/* Root redirect */}
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>

          {/* 404 fallback */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Router>
  );
}