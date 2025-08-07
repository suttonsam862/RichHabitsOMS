
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use navigation guard for safe routing
  const { safeNavigate } = useNavigationGuard({
    requireAuth: true,
    onNavigationBlocked: () => {
      console.warn('Navigation blocked due to authentication');
    }
  });

  // Handle authentication state changes
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Prevent navigation loops
  useEffect(() => {
    const preventLoop = () => {
      if (location.pathname === '/login' && user) {
        safeNavigate('/dashboard');
      }
    };
    
    preventLoop();
  }, [location.pathname, user, safeNavigate]);

  if (loading) {
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

  if (!user) {
    return null; // Let the navigation effect handle redirect
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
