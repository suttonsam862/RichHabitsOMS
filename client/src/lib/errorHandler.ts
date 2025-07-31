/**
 * Balanced Error Handler - Handles errors without breaking development tools
 */

// Fetch error tracking
const fetchErrorCounts = new Map<string, number>();
const FETCH_ERROR_THRESHOLD = 3;
const FETCH_ERROR_RESET_TIME = 30000; // 30 seconds

// Enhanced fetch wrapper to handle network failures
const originalFetch = window.fetch;
window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  const endpoint = url.split('?')[0]; // Remove query params

  try {
    const response = await originalFetch(input, init);

    // Reset error count on successful request
    if (response.ok && fetchErrorCounts.has(endpoint)) {
      fetchErrorCounts.delete(endpoint);
    }

    return response;
  } catch (error) {
    // Handle fetch failures specifically
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const errorCount = (fetchErrorCounts.get(endpoint) || 0) + 1;
      fetchErrorCounts.set(endpoint, errorCount);

      // Only log first few errors to avoid spam
      if (errorCount <= FETCH_ERROR_THRESHOLD) {
        console.warn(`🌐 Network error for ${endpoint} (${errorCount}/${FETCH_ERROR_THRESHOLD}):`, error.message);
      }

      // Reset count after timeout
      setTimeout(() => {
        fetchErrorCounts.delete(endpoint);
      }, FETCH_ERROR_RESET_TIME);

      // Create a user-friendly error
      const networkError = new Error(`Network request failed: ${endpoint}`);
      (networkError as any).isNetworkError = true;
      (networkError as any).originalError = error;
      throw networkError;
    }

    throw error;
  }
};

// Enhanced unhandled rejection handler
let rejectionCount = 0;
const MAX_REJECTIONS_PER_MINUTE = 10;

window.addEventListener('unhandledrejection', (event) => {
  rejectionCount++;

  // Reset count every minute
  setTimeout(() => {
    rejectionCount = Math.max(0, rejectionCount - 1);
  }, 60000);

  const error = event.reason;

  // Handle network errors specifically
  if (error?.isNetworkError || 
      (error?.message && error.message.includes('fetch')) ||
      (error?.message && error.message.includes('Failed to fetch'))) {

    // Only log if under threshold
    if (rejectionCount <= MAX_REJECTIONS_PER_MINUTE) {
      console.warn('🚨 Network request failed:', error.message);
    }

    // Always prevent default to stop console spam
    event.preventDefault();
    return;
  }

  // Handle other common development errors silently
  if (error?.message && (
    error.message.includes('ResizeObserver') ||
    error.message.includes('Non-Error promise rejection') ||
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Loading chunk')
  )) {
    event.preventDefault();
    return;
  }

  // Log other errors but limit spam
  if (rejectionCount <= MAX_REJECTIONS_PER_MINUTE) {
    console.error('Unhandled rejection:', error);
  }

  event.preventDefault();
});

// Global error handling configuration
const GLOBAL_ERROR_CONFIG = {
  enableLogging: true,
  enableToasts: false, // Disable toasts to prevent spam
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  // Filter out benign errors
  ignoredErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Load failed',
    'Script error',
    'Fetch aborted',
    'AbortError',
    'cancelled',
    'Failed to fetch',
    'NetworkError',
    'TypeError: Failed to fetch'
  ]
};

// Initialize global error handling
export const initializeErrorHandling = () => {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    handleGlobalError(error, {
      context: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Handle unhandled promise rejections with better filtering
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;

    // Prevent the default behavior for handled cases
    event.preventDefault();

    // Filter out common non-critical rejections
    if (reason && typeof reason === 'object') {
      // Ignore fetch-related rejections
      if (reason.name === 'TypeError' && reason.message?.includes('fetch')) {
        return;
      }

      // Ignore network errors
      if (reason.message?.includes('Failed to fetch') || 
          reason.message?.includes('NetworkError') ||
          reason.message?.includes('Load failed')) {
        return;
      }

      // Ignore abort errors
      if (reason.name === 'AbortError' || reason.message?.includes('aborted')) {
        return;
      }
    }

    // Only log significant errors
    if (reason && typeof reason === 'string' && GLOBAL_ERROR_CONFIG.ignoredErrors.some(ignored => reason.includes(ignored))) {
      return;
    }

    console.warn('Significant unhandled promise rejection:', reason);

    // Only handle truly critical errors
    if (reason && typeof reason === 'object' && reason.stack) {
      handleGlobalError(reason, {
        context: 'unhandled_rejection',
        promise: event.promise
      });
    }
  });

  console.log('✅ Global error handler initialized with rejection filtering');
};