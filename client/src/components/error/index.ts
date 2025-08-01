import React from 'react';

// Error Boundary exports for easy importing  
export { ErrorBoundary } from './ErrorBoundary';
export { GlobalErrorBoundary } from './GlobalErrorBoundary';
export { FeatureErrorBoundary } from './FeatureErrorBoundary';
export { AsyncErrorBoundary } from './AsyncErrorBoundary';
export { ComponentErrorBoundary } from './ComponentErrorBoundary';
export { default as ErrorBoundaryProvider } from './ErrorBoundaryProvider';

// Error boundary types
export type ErrorBoundaryFallback = React.ComponentType<{
  error: Error;
  resetError: () => void;
}>;

// Error boundary props
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Error logging utility
export const logError = (error: Error, context?: string) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };

  console.error('Application Error:', errorLog);

  // Emit custom event for error tracking
  window.dispatchEvent(new CustomEvent('app-error', {
    detail: errorLog
  }));

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorLog)
    }).catch(err => {
      console.error('Failed to log error to service:', err);
    });
  }
};

// Error boundary wrapper for React Query
export const withReactQueryErrorBoundary = <T extends object>(
  Component: React.ComponentType<T>
): React.ComponentType<T> => {
  const WrappedComponent = (props: T) => {
    // Import AsyncErrorBoundary dynamically to avoid circular dependency
    const { AsyncErrorBoundary: ErrorBoundary } = require('./AsyncErrorBoundary');
    return React.createElement(
      ErrorBoundary,
      { componentName: Component.displayName || Component.name || 'Component' },
      React.createElement(Component, props)
    );
  };

  WrappedComponent.displayName = `withReactQueryErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};