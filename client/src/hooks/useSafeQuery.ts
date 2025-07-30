/**
 * Enhanced useQuery hook with comprehensive error handling
 */
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { reportError } from '@/lib/errorHandler';

interface SafeQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  queryFn: () => Promise<T>;
  component?: string;
  action?: string;
  showErrorToUser?: boolean;
}

export function useSafeQuery<T>(
  options: SafeQueryOptions<T>
): UseQueryResult<T> {
  const { queryFn, component, action, showErrorToUser = false, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    queryFn: async () => {
      try {
        return await queryFn();
      } catch (error) {
        // Report error with context
        reportError(error, {
          component,
          action: action || 'query',
        });

        // Show user notification for critical errors if enabled
        if (showErrorToUser) {
          const toastEvent = new CustomEvent('showToast', {
            detail: {
              title: 'Error Loading Data',
              description: 'Unable to load the requested information. Please try again.',
              variant: 'destructive'
            }
          });
          window.dispatchEvent(toastEvent);
        }

        throw error;
      }
    }
  });
}