// Suppress Vite HMR ping errors in development
let viteErrorCount = 0;
const MAX_VITE_ERRORS = 2; // Reduced from 5
let hmrReconnecting = false;

// Track and suppress duplicate error messages
const errorMessageCache = new Map<string, number>();
const ERROR_CACHE_DURATION = 10000; // 10 seconds

// Override console.error to filter Vite HMR noise
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();
  const messageKey = message.substring(0, 100); // Use first 100 chars as key

  // Check if we've seen this error recently
  const now = Date.now();
  const lastSeen = errorMessageCache.get(messageKey);
  if (lastSeen && (now - lastSeen) < ERROR_CACHE_DURATION) {
    return; // Suppress duplicate
  }

  // Filter out Vite HMR-related errors during development
  if (import.meta.env.DEV) {
    if (
      message.includes('websocket connection to') ||
      message.includes('failed to fetch') ||
      message.includes('@vite/client') ||
      message.includes('hmr') ||
      message.includes('ping') ||
      message.includes('0.0.0.0:5173') ||
      message.includes('server connection lost')
    ) {
      viteErrorCount++;
      errorMessageCache.set(messageKey, now);

      // Log only first few Vite errors to avoid spam
      if (viteErrorCount <= MAX_VITE_ERRORS) {
        console.warn(`🔧 Vite HMR suppressed (${viteErrorCount}/${MAX_VITE_ERRORS})`);

        if (viteErrorCount === MAX_VITE_ERRORS) {
          console.warn('🔇 Vite HMR errors now fully suppressed');
        }
      }
      return;
    }
  }

  // Cache this error message
  errorMessageCache.set(messageKey, now);
  
  // Allow all other errors through
  originalConsoleError(...args);
};

// Handle WebSocket errors and fetch overrides for Vite HMR
if (import.meta.env.DEV) {
  // Override fetch to prevent 0.0.0.0 requests in Replit
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Rewrite 0.0.0.0 URLs to use current origin (Replit-specific fix)
    if (url.includes('0.0.0.0:5173') || url.includes('0.0.0.0:3000')) {
      const rewrittenUrl = url.replace(/https?:\/\/0\.0\.0\.0:\d+/, window.location.origin);
      console.debug('🔄 Rewriting Vite ping URL:', url, '→', rewrittenUrl);
      
      try {
        return await originalFetch(rewrittenUrl, init);
      } catch (error) {
        // Suppress Vite HMR ping failures silently
        hmrReconnecting = true;
        setTimeout(() => { hmrReconnecting = false; }, 5000);
        throw new Error('Vite HMR ping failed (suppressed)');
      }
    }
    
    // Block any remaining problematic URLs
    if (url.includes('0.0.0.0') && import.meta.env.DEV) {
      console.debug('🚫 Blocking 0.0.0.0 request in Replit:', url);
      throw new Error('0.0.0.0 requests blocked in Replit environment');
    }
    
    return originalFetch(input, init);
  };

  // Intercept WebSocket errors
  const originalWebSocket = window.WebSocket;

  window.WebSocket = class extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      // Rewrite WebSocket URLs if they use 0.0.0.0
      let wsUrl = url.toString();
      if (wsUrl.includes('0.0.0.0')) {
        wsUrl = wsUrl.replace(/0\.0\.0\.0:\d+/, window.location.host);
        console.debug('🔄 Rewriting WebSocket URL:', url, '→', wsUrl);
      }
      
      super(wsUrl, protocols);

      this.addEventListener('error', (event) => {
        // Suppress WebSocket errors for Vite HMR
        if (wsUrl.includes('ws://') || wsUrl.includes('wss://')) {
          console.debug('🔌 WebSocket error suppressed (Vite HMR)');
          event.stopPropagation();
          event.preventDefault();
        }
      });

      this.addEventListener('close', (event) => {
        // Suppress close events for Vite HMR
        if (wsUrl.includes('ws://') || wsUrl.includes('wss://')) {
          console.debug('🔌 WebSocket closed (Vite HMR)');
          hmrReconnecting = true;
          setTimeout(() => { hmrReconnecting = false; }, 3000);
        }
      });
    }
  };
}

// Export HMR status for other modules
export const isHmrReconnecting = () => hmrReconnecting;

export {};