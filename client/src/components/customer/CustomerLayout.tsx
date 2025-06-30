import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from './CustomerNavigation';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';

export function CustomerLayout() {
  const { user, loading } = useAuth();
  
  // Redirect if not a customer
  if (!loading && (!user || user.role !== 'customer')) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="container mx-auto p-6">
      <header className="mb-6 border-b pb-4">
        <CustomerNavigation />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}