// This file is intentionally empty to prevent fetch interception issues
// The auth system now works without complex interceptors

export const initializeFetchInterceptor = () => {
  // No-op - interceptor disabled to prevent auth issues
  console.log('✅ Fetch interceptor disabled for stability');
};

export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    console.error('Server health check failed:', error);
    return false;
  }
};

// Console error interceptor for network issues
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args[0];

    // Filter known Vite/development errors
    if (typeof message === 'string') {
      const ignoredMessages = [
        'Failed to fetch',
        'NetworkError',
        'chunk-',
        'Loading chunk',
        'ChunkLoadError',
        'Loading CSS chunk',
        'ResizeObserver loop completed with undelivered notifications',
        'ResizeObserver loop limit exceeded'
      ];

      if (ignoredMessages.some(ignored => message.includes(ignored))) {
        // Log but don't spam console
        if (Math.random() < 0.1) { // Only log 10% of these errors
          originalConsoleError('🔄 [Filtered Network Error]:', message);
        }
        return;
      }
    }

    originalConsoleError(...args);
  };