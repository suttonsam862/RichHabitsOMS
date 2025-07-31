// Simple, effective Vite HMR fix for Replit
let viteErrorCount = 0;
const MAX_VITE_ERRORS = 3;

// Cache for preventing duplicate errors
const errorCache = new Map<string, number>();
const CACHE_DURATION = 10000; // 10 seconds

// Remove console.error override to avoid conflicts with error handler

// Fix fetch for Vite HMR only - don't interfere with regular app requests
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : 
                input instanceof URL ? input.toString() : 
                (input as Request).url;

    // Only intercept Vite HMR ping requests
    if (url.includes('0.0.0.0') && url.includes('@vite/client')) {
      // Rewrite to use current origin instead of 0.0.0.0
      const rewrittenUrl = url.replace(/https?:\/\/0\.0\.0\.0:\d+/, window.location.origin);

      try {
        return await originalFetch(rewrittenUrl, init);
      } catch (error) {
        // Suppress HMR ping failures silently
        return Promise.reject(new Error('HMR ping failed (suppressed)'));
      }
    }

    // Pass through all other requests unchanged
    return originalFetch(input, init);
  };
}

// Suppress Vite-related errors aggressively but don't interfere with auth
    if (viteErrorCount > 10) {
      console.warn('🚨 Too many Vite errors suppressed, may indicate a real issue');
      viteErrorCount = 0;
    }

export {};