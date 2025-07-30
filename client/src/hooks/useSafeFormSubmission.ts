/**
 * Safe form submission hook with comprehensive error handling
 */
import { useState } from 'react';
import { reportError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/use-toast';

interface SafeFormSubmissionOptions {
  component?: string;
  action?: string;
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function useSafeFormSubmission(options: SafeFormSubmissionOptions = {}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    component = 'FormSubmission',
    action = 'submit',
    showSuccessToast = true,
    successMessage = 'Operation completed successfully',
    showErrorToast = true,
    onSuccess,
    onError
  } = options;

  const safeSubmit = async <T>(
    submitFn: () => Promise<T>
  ): Promise<T | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitFn();
      
      if (showSuccessToast) {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default"
        });
      }
      
      onSuccess?.();
      return result;
    } catch (err) {
      // Report error for monitoring
      reportError(err, { component, action });
      
      // Set local error state
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Show error toast
      if (showErrorToast) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
      
      onError?.(err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.status === 401) return 'Authentication required. Please log in again.';
    if (error?.status === 403) return 'Access denied. You don\'t have permission for this action.';
    if (error?.status >= 500) return 'Server error. Please try again later.';
    if (error?.status >= 400) return 'Invalid request. Please check your input.';
    return 'An unexpected error occurred. Please try again.';
  };

  return {
    safeSubmit,
    isSubmitting,
    error,
    clearError: () => setError(null)
  };
}