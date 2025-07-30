
import { useState, useEffect } from 'react';

// Types
interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for fetching and managing dashboard statistics
 * Extracted from AdminDashboard, SalespersonDashboard components
 */
export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    loading: true,
    error: null
  });

  const fetchStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/dashboard/stats');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch statistics');
      }
      
      setStats({
        ...result.data,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load statistics'
      }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const refetch = () => {
    fetchStats();
  };

  return {
    ...stats,
    refetch
  };
};
