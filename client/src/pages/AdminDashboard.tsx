import { useLocation } from 'wouter';
import React from 'react';

function AdminDashboard() {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    setLocation('/dashboard');
  }, [setLocation]);

  return null;
}

export default AdminDashboard;