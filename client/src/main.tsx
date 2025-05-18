import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";

// Completely disable Vite HMR on Replit to prevent WebSocket connection errors
if (typeof window !== 'undefined') {
  // Disable HMR completely regardless of environment
  const disableHMR = () => {
    // Block all Vite's HMR-related properties
    ['__vite_ws__', '__vite_hot__', '__vite_hmr__'].forEach(prop => {
      // Define getters/setters that make these properties unusable
      Object.defineProperty(window, prop, {
        configurable: true,
        get: () => null,
        set: () => {}
      });
    });
    
    // Create a dummy WebSocket constructor that does nothing
    const originalWebSocket = window.WebSocket;
    const noop = () => {};
    
    // Override WebSocket for any connection that looks like Vite HMR
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      let urlString = typeof url === 'string' ? url : url.toString();
      
      // If this looks like a Vite HMR connection attempt, return a dummy WebSocket
      if (urlString.includes('localhost:undefined') || 
          urlString.includes('undefined') || 
          urlString.includes('vite-hmr') ||
          urlString.includes('__vite')) {
        console.log("Blocked Vite HMR WebSocket connection attempt:", urlString);
        
        // Create a real WebSocket but to an endpoint we control that doesn't exist
        // This prevents the TypeError but also ensures the connection never succeeds
        const dummyWs = new originalWebSocket('ws://127.0.0.1:1/', protocols);
        
        // Close it immediately
        setTimeout(() => {
          try {
            dummyWs.close();
          } catch (e) {
            // Ignore
          }
        }, 50);
        
        return dummyWs;
      }
      
      // Otherwise use real WebSocket for legitimate connections
      return new originalWebSocket(url, protocols);
    } as any;
    
    // Preserve prototype and properties
    window.WebSocket.prototype = originalWebSocket.prototype;
    Object.defineProperties(window.WebSocket, 
      Object.getOwnPropertyDescriptors(originalWebSocket));
  };
  
  // Disable HMR immediately
  disableHMR();
  console.log("Vite HMR disabled to prevent WebSocket connection errors");
  
  // Also disable on any future page changes (for SPAs)
  document.addEventListener('DOMContentLoaded', disableHMR);
  window.addEventListener('load', disableHMR);
  
  // Disable any development debugging tools in production
  if (import.meta.env.MODE === 'production') {
    // This will prevent any debugger that might be attached to the window
    if ((window as any).eruda) {
      try {
        (window as any).eruda.destroy();
        delete (window as any).eruda;
      } catch (e) {
        console.error('Error cleaning up debug tools:', e);
      }
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
