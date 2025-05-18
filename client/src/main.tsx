import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";

// Completely disable Vite HMR on Replit to prevent WebSocket connection errors
if (typeof window !== 'undefined') {
  // Check if we're on Replit
  const isReplit = window.location.hostname.includes("replit") || 
                   window.location.hostname === 'localhost';
                   
  if (isReplit) {
    // Disable HMR by closing and nullifying Vite's WebSocket
    if ((window as any).__vite_plugin_react_preamble_installed__) {
      console.log("Disabling Vite HMR on Replit to prevent connection errors");
    }
    
    // Intercept and disable specific Vite WebSocket properties
    Object.defineProperty(window, '__vite_ws__', {
      get: () => null,
      set: () => {}
    });
    
    // Close any existing connection
    if ((window as any).__vite_ws__) {
      try {
        (window as any).__vite_ws__.close();
        (window as any).__vite_ws__ = null;
      } catch (e) {
        // Ignore errors
      }
    }
  }

  // Fall back to our fix for other cases
  fixWebSocketConnection();
  
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
