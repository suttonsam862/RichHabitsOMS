// Suppress Vite HMR ping errors in development
let viteErrorCount = 0;
const MAX_VITE_ERRORS = 1; // Reduced to minimal suppression
let hmrReconnecting = false;

// Cache to prevent duplicate error logging and excessive requests
const errorMessageCache = new Map<string, number>();
const urlRequestCache = new Map<string, number>();
const viteErrorCount = { count: 0 };
const VITE_ERROR_THRESHOLD = 5;

// Track and suppress duplicate error messages
const ERROR_CACHE_DURATION = 5000; // Reduced to 5 seconds

// Override console.error to filter Vite HMR noise - minimal suppression only
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  const messageKey = message.substring(0, 50); // Shorter key

  // Check if we've seen this error recently
  const now = Date.now();
  const lastSeen = errorMessageCache.get(messageKey);
  if (lastSeen && (now - lastSeen) < ERROR_CACHE_DURATION) {
    return; // Suppress duplicate
  }

  // Filter out only specific Vite HMR-related errors during development
  if (import.meta.env.DEV) {
    if (
      message.includes('[vite] connecting') ||
      message.includes('[vite] server connection lost') && message.includes('polling for restart')
    ) {
      viteErrorCount++;
      errorMessageCache.set(messageKey, now);

      // Log only first error to avoid spam
      if (viteErrorCount <= MAX_VITE_ERRORS) {
        console.debug(`🔧 Vite HMR suppressed (${viteErrorCount}/${MAX_VITE_ERRORS})`);
      }
      return;
    }
  }

  // Cache this error message
  errorMessageCache.set(messageKey, now);

  // Allow all other errors through
  originalConsoleError(...args);
};

// Handle WebSocket errors and fetch overrides for Vite HMR - minimal intervention
if (import.meta.env.DEV) {
  // Override fetch to prevent specific 0.0.0.0 requests in Replit
  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Only rewrite Vite ping URLs
    if (url.includes('0.0.0.0:5000') && url.includes('@vite/client')) {
      const rewrittenUrl = url.replace(/https?:\/\/0\.0\.0\.0:\d+/, window.location.origin);
      console.debug('🔄 Rewriting Vite ping URL:', url, '→', rewrittenUrl);

      // Prevent excessive requests that cause page refreshes
      const urlKey = rewrittenUrl.split('?')[0];
      const now = Date.now();
      const lastRequest = urlRequestCache.get(urlKey);

      if (lastRequest && now - lastRequest < 1000) {
        console.debug('⏳ Throttling Vite request to prevent refresh loop');
        return Promise.reject(new Error('Request throttled'));
      }

      urlRequestCache.set(urlKey, now);

      if (typeof input === 'string') {
        return originalFetch(rewrittenUrl, init);
      } else if (input instanceof URL) {
        return originalFetch(rewrittenUrl, init);
      } else {
        return originalFetch(rewrittenUrl, init);
      }
    }

    return originalFetch(input, init);
  };
}

// Export HMR status for other modules
export const isHmrReconnecting = () => hmrReconnecting;

export {};