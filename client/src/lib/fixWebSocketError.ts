/**
 * This script fixes the WebSocket connection error in Replit environments
 * by patching the WebSocket constructor that Vite uses for HMR.
 */
export const fixWebSocketConnection = () => {
  if (typeof window !== 'undefined') {
    // Store the original WebSocket constructor
    const OriginalWebSocket = window.WebSocket;

    // Create a proxy constructor that intercepts WebSocket creation
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      let urlString = typeof url === 'string' ? url : url.toString();

      // Check if this is a Vite HMR WebSocket with an invalid URL
      if (urlString.includes('localhost:undefined') || urlString.includes('undefined')) {
        // Get the current host and protocol
        const currentHost = window.location.hostname;
        const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        try {
          // Parse URL to get path and query parameters
          const originalUrl = new URL(urlString.replace('undefined', currentPort));
          const path = originalUrl.pathname;
          const searchParams = originalUrl.search;

          // Construct a proper WebSocket URL with proper port handling
          // For Replit, we often need to use the current host without explicit port
          const fixedUrl = currentHost.includes('replit') || currentHost.includes('repl.co') 
            ? `${protocol}//${currentHost}${path}${searchParams}`
            : `${protocol}//${currentHost}:${currentPort}${path}${searchParams}`;

          // Only log in development to reduce console noise
          if (process.env.NODE_ENV === 'development') {
            console.log('Fixed WebSocket URL:', fixedUrl);
          }

          // Create WebSocket with fixed URL and better error handling
          const ws = new OriginalWebSocket(fixedUrl, protocols);

          // Add error handling to prevent crashes
          ws.addEventListener('error', (event) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('WebSocket error (handled):', event);
            }
          });

          return ws;
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fixing WebSocket URL:', e);
          }
          // Fallback to original WebSocket if fix fails
          return new OriginalWebSocket(urlString, protocols);
        }
      }

      // For all other WebSocket connections, use the original constructor
      return new OriginalWebSocket(url, protocols);
    } as any;

    // Copy prototype and properties from original WebSocket
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    Object.defineProperties(window.WebSocket, 
      Object.getOwnPropertyDescriptors(OriginalWebSocket));

    console.log('WebSocket connection fix applied for Replit environment');
  }
};

// Fix for WebSocket connection issues in Replit environment
export function fixWebSocketError() {
  // Override WebSocket to handle connection issues gracefully
  if (typeof window !== 'undefined' && window.WebSocket) {
    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = class extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);

        // Add error handling for connection issues
        this.addEventListener('error', (event) => {
          console.warn('WebSocket connection error (handled):', event);
        });

        this.addEventListener('close', (event) => {
          if (event.code !== 1000) {
            console.warn('WebSocket closed unexpectedly:', event.code, event.reason);
          }
        });
      }
    };
  }

  // Handle unhandled promise rejections from WebSocket connections
  if (typeof window !== 'undefined') {
    const originalHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      // Check if it's a WebSocket-related error, network error, or API error
      if (event.reason && 
          (event.reason.message?.includes('WebSocket') || 
           event.reason.message?.includes('Failed to fetch') ||
           event.reason.message?.includes('NetworkError') ||
           event.reason.message?.includes('fetch') ||
           event.reason.message?.includes('HTTP 404') ||
           event.reason.message?.includes('404') ||
           event.reason.message?.includes('Connection refused') ||
           event.reason.status === 404 ||
           event.reason.status === 401 ||
           event.reason.status === 403 ||
           event.reason.name === 'NetworkError' ||
           event.reason.name === 'TypeError')) {
        // Suppress these common network errors to reduce console spam
        event.preventDefault();
        return;
      }

      // Call original handler for other rejections
      if (originalHandler) {
        originalHandler.call(window, event);
      }
    };
  }

  console.log('WebSocket connection fix applied for Replit environment');
}