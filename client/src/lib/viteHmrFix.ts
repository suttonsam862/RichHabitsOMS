// Suppress Vite HMR ping errors in development
let viteErrorCount = 0;
const MAX_VITE_ERRORS = 5;

// Override console.error to filter Vite HMR noise
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const message = args.join(' ').toLowerCase();

  // Filter out Vite HMR-related errors during development
  if (import.meta.env.DEV) {
    if (
      message.includes('websocket connection to') ||
      message.includes('failed to fetch') ||
      message.includes('@vite/client') ||
      message.includes('hmr') ||
      message.includes('ping')
    ) {
      viteErrorCount++;

      // Log only first few Vite errors to avoid spam
      if (viteErrorCount <= MAX_VITE_ERRORS) {
        console.warn(`🔧 Vite HMR issue (${viteErrorCount}/${MAX_VITE_ERRORS}):`, ...args);

        if (viteErrorCount === MAX_VITE_ERRORS) {
          console.warn('🔇 Further Vite HMR errors will be suppressed to reduce console noise');
        }
      }
      return;
    }
  }

  // Allow all other errors through
  originalConsoleError(...args);
};

// Handle WebSocket errors specifically for Vite
if (import.meta.env.DEV) {
  // Intercept WebSocket errors
  const originalWebSocket = window.WebSocket;

  window.WebSocket = class extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);

      this.addEventListener('error', (event) => {
        // Suppress WebSocket errors for Vite HMR
        if (url.toString().includes('ws://') || url.toString().includes('wss://')) {
          console.warn('🔌 WebSocket connection issue (likely Vite HMR) - suppressed');
          event.stopPropagation();
          event.preventDefault();
        }
      });

      this.addEventListener('close', (event) => {
        // Suppress close events for Vite HMR
        if (url.toString().includes('ws://') || url.toString().includes('wss://')) {
          console.warn('🔌 WebSocket closed (likely Vite HMR) - will retry automatically');
        }
      });
    }
  };
}

export {};