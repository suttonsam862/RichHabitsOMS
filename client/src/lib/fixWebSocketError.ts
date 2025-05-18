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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        try {
          // Parse URL to get path and query parameters
          const originalUrl = new URL(urlString);
          const path = originalUrl.pathname;
          const searchParams = originalUrl.search;
          
          // Construct a proper WebSocket URL
          // Use the current host and protocol, preserve path and query parameters
          const fixedUrl = `${protocol}//${currentHost}${path}${searchParams}`;
          
          console.log('Fixed WebSocket URL:', fixedUrl);
          
          // Create WebSocket with fixed URL
          return new OriginalWebSocket(fixedUrl, protocols);
        } catch (e) {
          console.error('Error fixing WebSocket URL:', e);
          
          // Fallback to simple replacement if URL parsing fails
          const fixedUrl = urlString.replace(/wss?:\/\/localhost:undefined/g, `${protocol}//${currentHost}`);
          return new OriginalWebSocket(fixedUrl, protocols);
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