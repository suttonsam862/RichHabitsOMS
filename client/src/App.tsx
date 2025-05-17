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

// Other pages
import { NotFound } from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import DesignTasks from "@/pages/DesignTasks";
import Messages from "@/pages/Messages";
import Production from "@/pages/Production";
import Payments from "@/pages/Payments";

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
                  path="/orders/:orderId" 
                  element={
                    <RequireAuth allowedRoles={['admin', 'salesperson', 'designer', 'manufacturer', 'customer']}>
                      <OrderDetail />
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
