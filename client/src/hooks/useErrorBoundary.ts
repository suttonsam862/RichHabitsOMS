import React, { useCallback } from 'react';

/**
 * Hook to manually trigger error boundaries
 * Useful for catching async errors that aren't caught by error boundaries
 */
export function useErrorBoundary() {
  const throwError = useCallback((error: Error) => {
    // Throw error on next tick to trigger error boundary
    setTimeout(() => {
      throw error;
    }, 0);
  }, []);

  const captureAsyncError = useCallback((errorHandler: (...args: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      try {
        return await errorHandler(...args);
      } catch (error) {
        console.error('Async error caught:', error);
        throwError(error instanceof Error ? error : new Error(String(error)));
        throw error; // Re-throw for local handling
      }
    };
  }, [throwError]);

  const wrapAsync = useCallback(<T extends (...args: any[]) => Promise<any>>(
    asyncFn: T,
    errorMessage?: string
  ): T => {
    return (async (...args: any[]) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const wrappedError = new Error(
          errorMessage || `Async operation failed: ${error instanceof Error ? error.message : String(error)}`
        );
        
        // Add original error as cause if possible
        if (error instanceof Error) {
          (wrappedError as any).cause = error;
        }
        
        throwError(wrappedError);
        throw wrappedError;
      }
    }) as T;
  }, [throwError]);

  return {
    throwError,
    captureAsyncError,
    wrapAsync
  };
}

/**
 * Higher-order component to wrap components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  ErrorBoundaryComponent: React.ComponentType<{ children: React.ReactNode; featureName: string }>,
  featureName: string
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props: P) => (
    <ErrorBoundaryComponent featureName={featureName}>
      <Component {...props} />
    </ErrorBoundaryComponent>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Error boundary context for nested error handling
 */
export interface ErrorBoundaryContextType {
  reportError: (error: Error, context?: string) => void;
  clearError: () => void;
  hasError: boolean;
}

export const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextType | null>(null);

export function useErrorBoundaryContext(): ErrorBoundaryContextType | null {
  return React.useContext(ErrorBoundaryContext);
}