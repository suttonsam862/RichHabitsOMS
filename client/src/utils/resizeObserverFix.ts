// ResizeObserver error suppression utility
// This prevents ResizeObserver loop errors from causing popup crashes

export function suppressResizeObserverErrors() {
  // Override the global ResizeObserver to catch and handle loop errors
  const OriginalResizeObserver = window.ResizeObserver;
  
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        try {
          callback(entries, observer);
        } catch (error) {
          // Check if it's a ResizeObserver loop error
          if (error instanceof Error && 
              (error.message.includes('ResizeObserver loop') ||
               error.message.includes('loop completed with undelivered notifications'))) {
            // Silently ignore ResizeObserver loop errors
            console.debug('ResizeObserver loop error suppressed:', error.message);
            return;
          }
          // Re-throw other errors
          throw error;
        }
      });
    }
  };

  // Also handle ResizeObserver errors in the window error handler
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && 
        (message.includes('ResizeObserver loop') ||
         message.includes('loop completed with undelivered notifications'))) {
      // Prevent the error from propagating
      console.debug('ResizeObserver error caught and suppressed:', message);
      return true; // Prevent default handling
    }
    
    // Call original handler for other errors
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Handle unhandled promise rejections related to ResizeObserver
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || '';
    if (errorMessage.includes('ResizeObserver') || 
        errorMessage.includes('loop completed with undelivered notifications')) {
      console.debug('ResizeObserver promise rejection suppressed:', errorMessage);
      event.preventDefault();
    }
  });
}

// Initialize the fix immediately when imported
suppressResizeObserverErrors();