// Simple error handler that doesn't interfere with auth flow
export function handleGlobalError(error: any, context: string = 'Unknown') {
  // Only log truly unexpected errors, skip network and auth errors
  if (
    error?.message?.includes('fetch') || 
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('Failed to fetch') ||
    context.includes('Auth') || 
    context.includes('Login') ||
    error?.message?.includes('401') ||
    error?.message?.includes('Unauthorized')
  ) {
    return;
  }

  console.error(`🚨 Error [${context}]:`, error);
}

export const initializeErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error, 'Global Error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Prevent default console spam
    event.preventDefault();

    // Only log non-network errors
    if (!event.reason?.message?.includes('fetch')) {
      handleGlobalError(event.reason, 'Promise Rejection');
    }
  });

  console.log('✅ Error handlers initialized');
};