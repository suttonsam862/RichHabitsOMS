import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { MainDashboardRouter } from "@/components/auth/MainDashboardRouter";

// Dashboard components
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import SalespersonDashboard from "@/pages/dashboard/SalespersonDashboard";
import DesignerDashboard from "@/pages/dashboard/DesignerDashboard";
import ManufacturerDashboard from "@/pages/dashboard/ManufacturerDashboard";
import CustomerDashboard from "@/pages/dashboard/CustomerDashboard";

// Customer pages
import CustomerOrdersPage from "@/pages/customer/OrdersPage";
import CustomerMessagesPage from "@/pages/customer/MessagesPage";

// Other pages
import { NotFound } from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import SetupPassword from "@/pages/SetupPassword";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import OrderEditor from "@/pages/OrderEditor";
import OrderCreatePage from "@/pages/orders/OrderCreatePage";
import OrderManagePage from "@/pages/orders/OrderManagePage";
import OrdersHub from "@/pages/OrdersHub";
import DesignTasks from "@/pages/DesignTasks";
import Messages from "@/pages/Messages";
import Production from "@/pages/Production";
import Payments from "@/pages/Payments";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import AdminManufacturerAssignment from "@/pages/AdminManufacturerAssignment";

// CustomerList is already imported via CustomerListPage
import CustomerListPage from "@/pages/admin/CustomerListPage";
import CustomerDetailsPage from "@/pages/admin/CustomerDetailsPage";
import CustomerEditPage from "@/pages/admin/CustomerEditPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import LegalManagementPage from "@/pages/admin/LegalManagementPage";
import CustomerInvitesPage from "@/pages/admin/CustomerInvitesPage";
import NewOrderInquiriesPage from "@/pages/admin/NewOrderInquiriesPage";
import ProductLibrary from "@/pages/ProductLibrary";
import CatalogPage from "@/pages/admin/CatalogPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <Routes>
              {/* Redirect from root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              
              {/* Main dashboard route that redirects to role-specific dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
                    <MainDashboardRouter />
                  </RequireAuth>
                } 
              />
              
              {/* Protected routes with layout */}
              <Route element={<AppLayout />}>
                {/* Admin routes */}
                <Route 
                  path="/dashboard/admin" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <AdminDashboard />
                    </RequireAuth>
                  } 
                />
                
                {/* Salesperson routes */}
                <Route 
                  path="/dashboard/salesperson" 
                  element={
                    <RequireAuth allowedRoles={['salesperson']}>
                      <SalespersonDashboard />
                    </RequireAuth>
                  } 
                />
                
                {/* Designer routes */}
                <Route 
                  path="/dashboard/designer" 
                  element={
                    <RequireAuth allowedRoles={['designer']}>
                      <DesignerDashboard />
                    </RequireAuth>
                  } 
                />
                
                {/* Manufacturer routes */}
                <Route 
                  path="/dashboard/manufacturer" 
                  element={
                    <RequireAuth allowedRoles={['manufacturer']}>
                      <ManufacturerDashboard />
                    </RequireAuth>
                  } 
                />
                
                {/* Customer routes */}
                <Route 
                  path="/dashboard/customer" 
                  element={
                    <RequireAuth allowedRoles={['customer']}>
                      <CustomerDashboard />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/customer/orders" 
                  element={
                    <RequireAuth allowedRoles={['customer']}>
                      <CustomerOrdersPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/customer/messages" 
                  element={
                    <RequireAuth allowedRoles={['customer']}>
                      <CustomerMessagesPage />
                    </RequireAuth>
                  } 
                />
                
                {/* Shared routes with role-based access */}
                <Route 
                  path="/orders" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
                      <OrdersHub />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/orders/create" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson']}>
                      <OrderCreatePage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/orders/:id" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
                      <OrderDetail />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/orders/edit/:id" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson']}>
                      <OrderEditor />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/messages" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
                      <Messages />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/design-tasks" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'designer']}>
                      <DesignTasks />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/production" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'manufacturer']}>
                      <Production />
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
                
                <Route 
                  path="/product-library" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson']}>
                      <ProductLibrary />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/manufacturer-assignment" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <AdminManufacturerAssignment />
                    </RequireAuth>
                  } 
                />
                
                
                
                <Route 
                  path="/admin/catalog" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <CatalogPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/customers" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <CustomerListPage />
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
                  path="/admin/customers/edit/:customerId" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <CustomerEditPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/settings" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <SettingsPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/settings" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <SettingsPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/analytics" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <AnalyticsPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/legal" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <LegalManagementPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/invites" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson']}>
                      <CustomerInvitesPage />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/inquiries" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson']}>
                      <NewOrderInquiriesPage />
                    </RequireAuth>
                  } 
                />
              </Route>
              
              {/* Catch-all for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
