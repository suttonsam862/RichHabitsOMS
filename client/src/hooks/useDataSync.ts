/**
 * Data Synchronization Hook
 * 
 * Provides utilities for managing data consistency across components
 */

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, getInvalidationKeys } from '@/lib/queryKeys';

export function useDataSync() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all customer-related queries
   */
  const syncCustomers = async () => {
    const keys = getInvalidationKeys('onCustomerChange');
    await Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: key })));
  };

  /**
   * Invalidate all catalog-related queries
   */
  const syncCatalog = async () => {
    const keys = getInvalidationKeys('onCatalogChange');
    await Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: key })));
  };

  /**
   * Invalidate all order-related queries
   */
  const syncOrders = async () => {
    const keys = getInvalidationKeys('onOrderChange');
    await Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: key })));
  };

  /**
   * Invalidate all team-related queries
   */
  const syncTeam = async () => {
    const keys = getInvalidationKeys('onTeamChange');
    await Promise.all(keys.map(key => queryClient.invalidateQueries({ queryKey: key })));
  };

  /**
   * Force refresh all cached data (nuclear option)
   */
  const refreshAll = async () => {
    await queryClient.invalidateQueries();
  };

  /**
   * Manually refetch specific query by key
   */
  const refetchQuery = async (queryKey: any[]) => {
    await queryClient.refetchQueries({ queryKey });
  };

  /**
   * Remove specific query from cache
   */
  const removeQuery = (queryKey: any[]) => {
    queryClient.removeQueries({ queryKey });
  };

  return {
    // Sync functions
    syncCustomers,
    syncCatalog,
    syncOrders,
    syncTeam,
    refreshAll,
    
    // Manual control
    refetchQuery,
    removeQuery,
    
    // Query client access
    queryClient,
  };
}

/**
 * Hook for standardized mutation success handlers
 */
export function useMutationSync() {
  const { syncCustomers, syncCatalog, syncOrders, syncTeam } = useDataSync();

  return {
    onCustomerSuccess: syncCustomers,
    onCatalogSuccess: syncCatalog,
    onOrderSuccess: syncOrders,
    onTeamSuccess: syncTeam,
  };
}