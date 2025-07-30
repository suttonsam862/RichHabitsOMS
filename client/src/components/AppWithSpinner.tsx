import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useMutationTracker } from "../context/MutationContext";
import { useRoutePreloader } from '@/hooks/useRoutePreloader';
import { useAuth } from '@/hooks/use-auth';
import { GlobalSpinner } from "./ui/global-spinner";
import { AppLayout } from "./layout/AppLayout";
import { RequireAuth } from "./auth/RequireAuth";
import { MainDashboardRouter } from "./auth/MainDashboardRouter";
import { NavigationManager } from "./navigation/NavigationManager";
import { FeatureErrorBoundary } from "./error/FeatureErrorBoundary";

// Dashboard components
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import SalespersonDashboard from "../pages/dashboard/SalespersonDashboard";
import DesignerDashboard from "../pages/dashboard/DesignerDashboard";
import ManufacturerDashboard from "../pages/dashboard/ManufacturerDashboard";
import CustomerDashboard from "../pages/dashboard/CustomerDashboard";

// Customer pages
import CustomerOrdersPage from "../pages/customer/OrdersPage";
import CustomerMessagesPage from "../pages/customer/MessagesPage";

// Other pages
import { NotFound } from "../pages/not-found";
import Login from "../pages/Login";
import Register from "../pages/Register";
import SetupPassword from "../pages/SetupPassword";
import Orders from "../pages/Orders";
import OrderDetail from "../pages/OrderDetail";
import OrderEditor from "../pages/OrderEditor";
import OrderEditPage from "../pages/OrderEditPage";
import OrderCreatePage from "../pages/orders/OrderCreatePage";
import OrderManagePage from "../pages/orders/OrderManagePage";
import EnhancedOrderManagement from "../pages/orders/EnhancedOrderManagement";
import EnhancedOrderManagementWithCards from "../pages/orders/EnhancedOrderManagementWithCards";
import OrdersHub from "../pages/OrdersHub";
import DesignTasks from "../pages/DesignTasks";
import Messages from "../pages/Messages";
import Production from "../pages/Production";
import Payments from "../pages/Payments";
import PaymentSuccess from "../pages/PaymentSuccess";
import PaymentCancel from "../pages/PaymentCancel";
import AdminManufacturerAssignment from "../pages/AdminManufacturerAssignment";

// CustomerList is already imported via CustomerListPage
import CustomerListPage from "../pages/admin/CustomerListPage";
import CustomerDetailsPage from "../pages/admin/CustomerDetailsPage";
import CustomerEditPage from "../pages/admin/CustomerEditPage";
import SettingsPage from '../pages/admin/SettingsPage';
import UserPermissionsPage from '../pages/admin/UserPermissionsPage';
import CustomPermissionsBuilder from '../pages/admin/CustomPermissionsBuilder';
import UserManagementPage from '../pages/admin/UserManagementPage';
import SecurityManagementPage from '../pages/admin/SecurityManagementPage';
import CatalogPage from '../pages/admin/CatalogPage';
import CatalogItemEditPage from '../pages/admin/CatalogItemEditPage';
import ManufacturerEditPage from '../pages/admin/ManufacturerEditPage';
import AnalyticsPage from "../pages/admin/AnalyticsPage";
import ProductionTimelinePage from "../pages/ProductionTimelinePage";
import LegalManagementPage from "../pages/admin/LegalManagementPage";
import CustomerInvitesPage from "../pages/admin/CustomerInvitesPage";
import NewOrderInquiriesPage from "../pages/admin/NewOrderInquiriesPage";
import SalesManagementPage from "../pages/admin/SalesManagementPage";
import ProductLibrary from "../pages/ProductLibrary";

// Component that wraps the app content with route preloading
function AppContent() {
  const { user } = useAuth();
  
  // Initialize route preloader for intelligent preloading
  useRoutePreloader(user?.role);

  return (
    <Routes>
      {/* Redirect from root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />

      {/* Main authenticated layout */}
      <Route 
        path="/" 
        element={<AppLayout />}
      >
        {/* Main dashboard router */}
        <Route path="/dashboard" element={<MainDashboardRouter />} />

        {/* Individual dashboards */}
        <Route 
          path="/dashboard/admin" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <FeatureErrorBoundary featureName="Admin Dashboard">
                <AdminDashboard />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/dashboard/salesperson" 
          element={
            <RequireAuth allowedRoles={['salesperson']}>
              <FeatureErrorBoundary featureName="Salesperson Dashboard">
                <SalespersonDashboard />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/dashboard/designer" 
          element={
            <RequireAuth allowedRoles={['designer']}>
              <FeatureErrorBoundary featureName="Designer Dashboard">
                <DesignerDashboard />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/dashboard/manufacturer" 
          element={
            <RequireAuth allowedRoles={['manufacturer']}>
              <FeatureErrorBoundary featureName="Manufacturer Dashboard">
                <ManufacturerDashboard />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/dashboard/customer" 
          element={
            <RequireAuth allowedRoles={['customer']}>
              <FeatureErrorBoundary featureName="Customer Dashboard">
                <CustomerDashboard />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        {/* Order management routes */}
        <Route 
          path="/orders" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson']}>
              <FeatureErrorBoundary featureName="Order Management">
                <EnhancedOrderManagement />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/orders/:orderId" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer']}>
              <FeatureErrorBoundary featureName="Order Detail">
                <OrderDetail />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/orders/edit/:orderId" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson']}>
              <FeatureErrorBoundary featureName="Order Edit">
                <OrderEditPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/orders/create" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson']}>
              <FeatureErrorBoundary featureName="Order Creation">
                <OrderCreatePage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        {/* Catalog management routes */}
        <Route 
          path="/catalog" 
          element={
            <RequireAuth allowedRoles={['admin', 'catalog_manager']}>
              <FeatureErrorBoundary featureName="Catalog Management">
                <CatalogPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/catalog" 
          element={
            <RequireAuth allowedRoles={['admin', 'catalog_manager']}>
              <FeatureErrorBoundary featureName="Catalog Management">
                <CatalogPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/catalog/:itemId/edit" 
          element={
            <RequireAuth allowedRoles={['admin', 'catalog_manager']}>
              <FeatureErrorBoundary featureName="Catalog Item Edit">
                <CatalogItemEditPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        {/* Customer management routes */}
        <Route 
          path="/customers" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <FeatureErrorBoundary featureName="Customer Management">
                <CustomerListPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/customers" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <FeatureErrorBoundary featureName="Customer Management">
                <CustomerListPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/customers/:customerId" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <CustomerDetailsPage />
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/customers/:customerId/edit" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <CustomerEditPage />
            </RequireAuth>
          } 
        />

        {/* Manufacturing routes */}
        <Route 
          path="/manufacturing" 
          element={
            <RequireAuth allowedRoles={['admin', 'manufacturer']}>
              <FeatureErrorBoundary featureName="Manufacturing">
                <EnhancedOrderManagement />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/production" 
          element={
            <RequireAuth allowedRoles={['admin', 'manufacturer']}>
              <FeatureErrorBoundary featureName="Production Management">
                <Production />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        <Route 
          path="/design-tasks" 
          element={
            <RequireAuth allowedRoles={['admin', 'designer']}>
              <FeatureErrorBoundary featureName="Design Tasks">
                <DesignTasks />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        {/* Admin routes */}
        <Route 
          path="/admin/settings" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <SettingsPage />
            </RequireAuth>
          } 
        />

        <Route 
          path="/admin/user-management" 
          element={
            <RequireAuth allowedRoles={['admin']}>
              <FeatureErrorBoundary featureName="User Management">
                <UserManagementPage />
              </FeatureErrorBoundary>
            </RequireAuth>
          } 
        />

        {/* Other routes */}
        <Route 
          path="/messages" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
              <Messages />
            </RequireAuth>
          } 
        />

        <Route 
          path="/payments" 
          element={
            <RequireAuth allowedRoles={['admin', 'salesperson', 'customer']}>
              <Payments />
            </RequireAuth>
          } 
        />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export function AppWithSpinner() {
  const { isAnyMutationPending } = useMutationTracker();

  return (
    <>
      <Router>
        <NavigationManager />
        <AppContent />
        
        {/* Global spinner when mutations are pending */}
        {isAnyMutationPending && (
          <GlobalSpinner show={isAnyMutationPending} />
        )}
      </Router>
    </>
  );
}