// Global error handler configuration
interface ErrorConfig {
  maxErrorsPerMinute: number;
  resetInterval: number;
  logNetworkErrors: boolean;
  logAuthErrors: boolean;
}

const ERROR_CONFIG: ErrorConfig = {
  maxErrorsPerMinute: 20,
  resetInterval: 60000, // 1 minute
  logNetworkErrors: false, // Disable network error logging
  logAuthErrors: false,   // Disable auth error logging
};

// Error tracking
let errorCount = 0;
let lastResetTime = Date.now();

// Reset error count periodically
const resetErrorCount = () => {
  const now = Date.now();
  if (now - lastResetTime >= ERROR_CONFIG.resetInterval) {
    errorCount = 0;
    lastResetTime = now;
  }
};

export function handleGlobalError(error: any, context: string = 'Unknown') {
  resetErrorCount();

  // Rate limit error handling
  if (errorCount >= ERROR_CONFIG.maxErrorsPerMinute) {
    return;
  }

  // Skip network and auth-related errors
  if (
    !ERROR_CONFIG.logNetworkErrors && 
    (error?.message?.includes('fetch') || 
     error?.message?.includes('NetworkError') ||
     error?.message?.includes('Failed to fetch'))
  ) {
    return;
  }

  if (
    !ERROR_CONFIG.logAuthErrors &&
    (context.includes('Auth') || 
     context.includes('Login') ||
     error?.message?.includes('401') ||
     error?.message?.includes('Unauthorized'))
  ) {
    return;
  }

  errorCount++;

  // Only log truly unexpected errors
  console.error(`🚨 Global Error [${context}]:`, {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    context
  });
}

// Initialize error handlers
export const initializeErrorHandlers = () => {
  // Global error handler
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error, 'Global Error Event');
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent default console logging of promise rejections
    event.preventDefault();

    // Only log if it's not a network/auth error
    if (!event.reason?.message?.includes('fetch') && 
        !event.reason?.message?.includes('Failed to fetch')) {
      handleGlobalError(event.reason, 'Unhandled Promise Rejection');
    }
  });

  console.log('✅ Global error handler initialized');
};

// Export for manual error reporting
export { ERROR_CONFIG };