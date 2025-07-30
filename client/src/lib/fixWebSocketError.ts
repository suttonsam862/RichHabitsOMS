/**
 * Enhanced WebSocket connection fix for Replit environments
 * Addresses Vite HMR connection polling issues and console spam
 */
export const fixWebSocketConnection = () => {
  if (typeof window !== 'undefined') {
    // Store the original WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    let connectionAttempts = 0;
    const maxConnectionAttempts = 3;

    // Create a proxy constructor that intercepts WebSocket creation
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      let urlString = typeof url === 'string' ? url : url.toString();

      // Enhanced Vite HMR WebSocket detection and fixing
      if (urlString.includes('localhost:undefined') || urlString.includes('undefined') || urlString.includes('_vite_ping')) {
        connectionAttempts++;
        
        // Limit connection attempts to prevent spam
        if (connectionAttempts > maxConnectionAttempts) {
          // Return a mock WebSocket that prevents further polling
          return {
            addEventListener: () => {},
            removeEventListener: () => {},
            send: () => {},
            close: () => {},
            readyState: WebSocket.CLOSED,
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null,
            bufferedAmount: 0,
            extensions: '',
            protocol: '',
            url: urlString,
            binaryType: 'blob',
            dispatchEvent: () => false,
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED
          } as WebSocket;
        }

        // Get the current host and protocol
        const currentHost = window.location.hostname;
        const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        try {
          // Parse URL to get path and query parameters
          const originalUrl = new URL(urlString.replace('undefined', currentPort).replace('localhost:undefined', `${currentHost}:${currentPort}`));
          const path = originalUrl.pathname;
          const searchParams = originalUrl.search;

          // Construct a proper WebSocket URL with enhanced Replit handling
          let fixedUrl;
          if (currentHost.includes('replit') || currentHost.includes('repl.co')) {
            // For Replit, use the secure protocol without explicit port
            fixedUrl = `wss://${currentHost}${path}${searchParams}`;
          } else {
            // For local development
            fixedUrl = `${protocol}//${currentHost}:${currentPort}${path}${searchParams}`;
          }

          // Create WebSocket with enhanced error handling
          const ws = new OriginalWebSocket(fixedUrl, protocols);

          // Suppress error logging for HMR connections to reduce console spam
          ws.addEventListener('error', (event) => {
            // Silently handle HMR connection errors
            event.preventDefault();
            event.stopPropagation();
          });

          ws.addEventListener('close', (event) => {
            // Reset connection attempts on successful close
            if (event.code === 1000) {
              connectionAttempts = 0;
            }
          });

          ws.addEventListener('open', () => {
            // Reset connection attempts on successful connection
            connectionAttempts = 0;
          });

          return ws;
        } catch (e) {
          // Silently handle WebSocket creation errors for HMR
          return {
            addEventListener: () => {},
            removeEventListener: () => {},
            send: () => {},
            close: () => {},
            readyState: WebSocket.CLOSED,
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null,
            bufferedAmount: 0,
            extensions: '',
            protocol: '',
            url: urlString,
            binaryType: 'blob',
            dispatchEvent: () => false,
            CONNECTING: WebSocket.CONNECTING,
            OPEN: WebSocket.OPEN,
            CLOSING: WebSocket.CLOSING,
            CLOSED: WebSocket.CLOSED
          } as WebSocket;
        }
      }

      // For all other WebSocket connections, use the original constructor
      return new OriginalWebSocket(url, protocols);
    } as any;

    // Copy prototype and properties from original WebSocket
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    Object.defineProperties(window.WebSocket, 
      Object.getOwnPropertyDescriptors(OriginalWebSocket));
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

  // Handle unhandled promise rejections more comprehensively
  if (typeof window !== 'undefined') {
    const originalHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      const reason = event.reason;
      
      // Only suppress WebSocket and HMR-related errors
      if (reason && (
          reason.message?.includes('WebSocket') ||
          reason.message?.includes('_vite_ping') ||
          reason.message?.includes('[vite] server connection lost') ||
          reason.message?.includes('HMR') ||
          // Only suppress expected auth failures during startup
          (reason.status === 401 && reason.message?.includes('Not authenticated') && !window.location.pathname.includes('/login')) ||
          String(reason).trim() === ''
      )) {
        // Suppress these errors completely
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