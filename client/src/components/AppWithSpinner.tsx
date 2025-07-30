import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';
import { GlobalSpinner } from '@/components/ui/global-spinner';

// Import dashboards
import AdminDashboard from '@/pages/dashboard/AdminDashboard';
import CustomerDashboard from '@/pages/dashboard/CustomerDashboard';
import ManufacturerDashboard from '@/pages/dashboard/ManufacturerDashboard';
import SalespersonDashboard from '@/pages/dashboard/SalespersonDashboard';
import DesignerDashboard from '@/pages/dashboard/DesignerDashboard';

export function AppWithSpinner() {
  const { user, loading } = useAuth();

  if (loading) {
    return <GlobalSpinner />;
  }

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // Route user to appropriate dashboard based on role
  const getDashboardComponent = () => {
    const role = user.role?.toLowerCase();

    switch (role) {
      case 'admin':
      case 'super_admin':
        return <AdminDashboard />;
      case 'customer':
        return <CustomerDashboard />;
      case 'manufacturer':
        return <ManufacturerDashboard />;
      case 'salesperson':
        return <SalespersonDashboard />;
      case 'designer':
        return <DesignerDashboard />;
      default:
        return <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Error</h1>
          <p>Unable to determine your role. Please contact support.</p>
          <p className="text-sm text-gray-500 mt-2">Role: {user.role}</p>
        </div>;
    }
  };

  return (
    <Router>
      <Suspense fallback={<GlobalSpinner />}>
        <Routes>
          <Route path="/" element={getDashboardComponent()} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}