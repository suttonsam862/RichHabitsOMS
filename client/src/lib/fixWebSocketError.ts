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
      // Check if this is a Vite HMR WebSocket with an invalid URL
      if (typeof url === 'string' && url.includes('localhost:undefined')) {
        // Get the current host without port
        const currentHost = window.location.hostname;
        
        // Replace the invalid localhost URL with the proper WebSocket URL
        const fixedUrl = url.replace('localhost:undefined', currentHost);
        
        // Create WebSocket with fixed URL
        return new OriginalWebSocket(fixedUrl, protocols);
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