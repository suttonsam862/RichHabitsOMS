import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorBoundaryContextType {
  reportError: (error: Error, context?: string) => void;
  clearError: () => void;
  hasError: boolean;
  errorInfo: {
    error: Error | null;
    context?: string;
    timestamp?: Date;
  };
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

export const useErrorBoundaryContext = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundaryContext must be used within an ErrorBoundaryProvider');
  }
  return context;
};

interface ErrorBoundaryProviderProps {
  children: ReactNode;
  onError?: (error: Error, context?: string) => void;
}

/**
 * Provider for error boundary context
 * Allows components to report errors programmatically
 */
export function ErrorBoundaryProvider({ children, onError }: ErrorBoundaryProviderProps) {
  const [errorInfo, setErrorInfo] = useState<{
    error: Error | null;
    context?: string;
    timestamp?: Date;
  }>({
    error: null
  });

  const reportError = (error: Error, context?: string) => {
    const errorData = {
      error,
      context,
      timestamp: new Date()
    };
    
    setErrorInfo(errorData);
    
    // Call external error handler if provided
    if (onError) {
      onError(error, context);
    }

    // Log error
    console.error('Error reported via context:', {
      message: error.message,
      context,
      stack: error.stack
    });

    // Emit error event
    window.dispatchEvent(new CustomEvent('context-error', {
      detail: errorData
    }));
  };

  const clearError = () => {
    setErrorInfo({ error: null });
  };

  const contextValue: ErrorBoundaryContextType = {
    reportError,
    clearError,
    hasError: !!errorInfo.error,
    errorInfo
  };

  return (
    <ErrorBoundaryContext.Provider value={contextValue}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
}

export default ErrorBoundaryProvider;