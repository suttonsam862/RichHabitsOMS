import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";

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
import DesignTasks from "@/pages/DesignTasks";
import Messages from "@/pages/Messages";
import Production from "@/pages/Production";
import Payments from "@/pages/Payments";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import AdminManufacturerAssignment from "@/pages/AdminManufacturerAssignment";
import AdminOversightDashboard from "@/pages/AdminOversightDashboard";
import CustomerList from "@/pages/admin/CustomerList";
import CustomerListPage from "@/pages/admin/CustomerListPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              
              {/* Redirect from root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
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
                      <Orders />
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
                  path="/manufacturer-assignment" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <AdminManufacturerAssignment />
                    </RequireAuth>
                  } 
                />
                
                <Route 
                  path="/admin/oversight" 
                  element={
                    <RequireAuth allowedRoles={['admin']}>
                      <AdminOversightDashboard />
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
                  path="/admin/settings" 
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
