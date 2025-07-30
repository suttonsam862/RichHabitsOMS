/**
 * Enhanced useMutation hook with comprehensive error handling
 */
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { reportError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface SafeMutationOptions<TData, TError, TVariables> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  component?: string;
  action?: string;
  showErrorToUser?: boolean;
  showSuccessToUser?: boolean;
  successMessage?: string;
}

export function useSafeMutation<TData = unknown, TError = unknown, TVariables = void>(
  options: SafeMutationOptions<TData, TError, TVariables>
): UseMutationResult<TData, TError, TVariables> {
  const { toast } = useToast();
  const { 
    mutationFn, 
    component, 
    action, 
    showErrorToUser = true, 
    showSuccessToUser = false,
    successMessage,
    onError,
    onSuccess,
    ...mutationOptions 
  } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn: async (variables: TVariables) => {
      try {
        const result = await mutationFn(variables);
        
        // Show success message if enabled
        if (showSuccessToUser && successMessage) {
          toast({
            title: "Success",
            description: successMessage,
            variant: "default"
          });
        }
        
        return result;
      } catch (error) {
        // Report error with context
        reportError(error, {
          component,
          action: action || 'mutation',
        });

        // Show user notification for errors if enabled
        if (showErrorToUser) {
          let errorMessage = 'An unexpected error occurred. Please try again.';
          
          if (error && typeof error === 'object') {
            const err = error as any;
            if (err.message) {
              errorMessage = err.message;
            } else if (err.status === 401) {
              errorMessage = 'Authentication required. Please log in again.';
            } else if (err.status === 403) {
              errorMessage = 'Access denied. You don\'t have permission for this action.';
            } else if (err.status >= 500) {
              errorMessage = 'Server error. Please try again later.';
            }
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
        }

        throw error;
      }
    },
    onError: (error, variables, context) => {
      // Call original onError if provided
      onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Call original onSuccess if provided
      onSuccess?.(data, variables, context);
    }
  });
}