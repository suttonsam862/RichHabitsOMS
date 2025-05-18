import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";

// Fix WebSocket connection issues with Vite HMR
fixWebSocketConnection();

// Disable any development debugging tools in production
// This will prevent Eruda and similar tools from running in production
if (typeof window !== 'undefined') {
  // Remove any debugging tools from window object that might be auto-initialized
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
