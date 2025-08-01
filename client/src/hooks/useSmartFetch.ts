/**
 * Smart fetch hook with comprehensive error handling and spam prevention
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface SmartFetchOptions extends Omit<UseQueryOptions, 'queryKey' | 'queryFn'> {
  endpoint: string;
  headers?: HeadersInit;
  enablePolling?: boolean;
  pollInterval?: number;
  maxRetries?: number;
  circuitBreakerEnabled?: boolean;
}

interface SmartFetchState {
  isBlocked: boolean;
  errorCount: number;
  lastError: Error | null;
  backoffDelay: number;
}

const fetchStates = new Map<string, SmartFetchState>();

export function useSmartFetch<T = any>(options: SmartFetchOptions) {
  const {
    endpoint,
    headers = {},
    enablePolling = false,
    pollInterval = 30000,
    maxRetries = 1,
    circuitBreakerEnabled = true,
    ...queryOptions
  } = options;

  const [state, setState] = useState<SmartFetchState>(() => {
    return fetchStates.get(endpoint) || {
      isBlocked: false,
      errorCount: 0,
      lastError: null,
      backoffDelay: 1000
    };
  });

  // Update the global state when local state changes
  useEffect(() => {
    fetchStates.set(endpoint, state);
  }, [endpoint, state]);

  const queryResult = useQuery({
    queryKey: [endpoint],
    queryFn: async () => {
      // Check if this endpoint is currently blocked
      if (circuitBreakerEnabled && state.isBlocked) {
        throw new Error(`Endpoint ${endpoint} is temporarily blocked due to repeated failures`);
      }

      try {
        const authToken = localStorage.getItem('authToken') || localStorage.getItem('token') || 'dev-admin-token-12345';
        
        // Ensure endpoint starts with /api for catalog requests
        const fullEndpoint = endpoint.startsWith('/api') ? endpoint : `/api/${endpoint}`;
        
        const response = await fetch(fullEndpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...headers
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }));
          console.error(`❌ Fetch error for ${fullEndpoint}:`, errorData);
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Reset error state on success
        if (state.errorCount > 0) {
          setState(prev => ({
            ...prev,
            errorCount: 0,
            lastError: null,
            isBlocked: false,
            backoffDelay: 1000
          }));
        }

        // Handle catalog-specific data structure
        if (fullEndpoint.includes('/catalog')) {
          return data.data || data;
        }

        return data.data || data.orders || data.customers || data.teamMembers || data;
      } catch (error) {
        console.warn(`Smart fetch error for ${endpoint}:`, error);
        
        const newErrorCount = state.errorCount + 1;
        const shouldBlock = circuitBreakerEnabled && newErrorCount >= maxRetries;
        
        setState(prev => ({
          ...prev,
          errorCount: newErrorCount,
          lastError: error as Error,
          isBlocked: shouldBlock,
          backoffDelay: Math.min(prev.backoffDelay * 2, 30000) // Exponential backoff, max 30s
        }));

        // If we should block, schedule an unblock
        if (shouldBlock) {
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              isBlocked: false,
              errorCount: 0,
              backoffDelay: 1000
            }));
          }, state.backoffDelay);
        }

        throw error;
      }
    },
    enabled: !state.isBlocked && queryOptions.enabled !== false,
    refetchInterval: enablePolling && !state.isBlocked ? pollInterval : false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry if blocked or auth errors
      if (state.isBlocked || error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < maxRetries;
    },
    staleTime: 300000, // 5 minutes
    ...queryOptions
  });

  return {
    ...queryResult,
    isBlocked: state.isBlocked,
    errorCount: state.errorCount,
    lastError: state.lastError,
    resetErrors: () => {
      setState({
        isBlocked: false,
        errorCount: 0,
        lastError: null,
        backoffDelay: 1000
      });
    }
  };
}

// Utility to reset all fetch states
export function resetAllFetchStates() {
  fetchStates.clear();
  console.log('🔄 All smart fetch states reset');
}

// Utility to get current fetch states for debugging
export function getFetchStates() {
  return Object.fromEntries(fetchStates.entries());
}