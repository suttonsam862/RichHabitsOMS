
/**
 * This script fixes the WebSocket connection error in Replit environments
 * by patching the WebSocket constructor that Vite uses for HMR.
 */

// Run this code once when the app loads
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
          const fixedUrl = `${protocol}//${currentHost}:${currentPort}${path}${searchParams}`;
          
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
      
    // Add additional logging for errors
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('WebSocket')) {
        console.warn('WebSocket error intercepted:', event.message);
      }
    });
    
    console.log('WebSocket connection fix applied for Replit environment');
  }
};
