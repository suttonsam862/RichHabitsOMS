import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Only import the essential components for simple auth flow
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';

// Simple placeholder components for missing pages
const Register = () => <div>Register page coming soon</div>;
const SetupPassword = () => <div>Setup password page</div>;
const PaymentSuccess = () => <div>Payment successful!</div>;
const PaymentCancel = () => <div>Payment cancelled</div>;
const NotFound = () => <div>Page not found</div>;

// Component to require authentication
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin w-12 h-12 border-4 border-[#00d1ff] border-t-transparent rounded-full"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-md"></div>
          </div>
          <div className="text-white/70 text-sm font-medium">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      
      {/* Simple dashboard route */}
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}