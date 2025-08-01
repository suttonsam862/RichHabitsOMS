import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
// Initialize error handling with simplified approach
import "./lib/errorHandler";
import "./index.css";

// Completely disable Vite HMR to prevent promise rejection spam
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Intercept the Vite client import and disable HMR altogether
  const originalFetch = window.fetch;
  window.fetch = function(input, init?) {
    const url = typeof input === 'string' ? input : (input as Request).url;
    
    // Block ALL Vite development server polling that causes rejections
    if (url.includes('__vite_ping') || 
        url.includes('@vite/client') || 
        url.includes('vite-dev-server') ||
        url.includes(':5173') ||
        url.includes('/@vite/') ||
        (url.includes('ping') && import.meta.env.DEV)) {
      
      // Return successful response immediately to stop polling
      return Promise.resolve(new Response(JSON.stringify({ 
        status: 'ok',
        type: 'connected' 
      }), {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    
    return originalFetch.call(this, input, init);
  };

  // Also disable WebSocket connections for HMR
  const originalWebSocket = window.WebSocket;
  window.WebSocket = class extends WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('__vite_hmr') || urlStr.includes(':5173') || urlStr.includes('vite')) {
        // Create a mock WebSocket that doesn't actually connect
        super('ws://localhost:0'); // Invalid address to prevent connection
        this.close(); // Close immediately
        return this;
      }
      super(url, protocols);
    }
  };
}

// Add global unhandled promise rejection handler as backup
window.addEventListener('unhandledrejection', (event) => {
  // Enhanced filtering for all Vite dev server errors  
  const errorMessage = event.reason?.message || '';
  const errorStack = event.reason?.stack || '';
  
  const isViteDevError = (
    // Vite client ping errors
    (errorStack.includes('@vite/client') && errorMessage.includes('Failed to fetch')) ||
    (errorStack.includes('ping') && errorMessage.includes('Failed to fetch')) ||
    (errorStack.includes('waitForSuccessfulPing') && errorMessage.includes('Failed to fetch')) ||
    // Generic dev server connection issues
    (errorMessage === 'Failed to fetch' && errorStack.includes('vite')) ||
    // WebSocket and HMR connection errors
    (errorMessage.includes('WebSocket') && import.meta.env.DEV) ||
    (errorStack.includes('websocket') && import.meta.env.DEV) ||
    (errorStack.includes('hmr') && import.meta.env.DEV) ||
    // Network errors during development
    (event.reason?.name === 'TypeError' && errorMessage === 'Failed to fetch' && import.meta.env.DEV) ||
    // Connection refused errors in development
    (errorMessage.includes('Connection refused') && import.meta.env.DEV)
  );
  
  if (isViteDevError) {
    // Completely silent prevention for all Vite dev errors
    event.preventDefault();
    return;
  }
  
  // Log only non-dev related promise rejections
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
  console.error('🔍 Promise:', event.promise);
  console.error('📍 Stack trace:', event.reason?.stack || 'No stack trace available');
  
  // Prevent the default browser behavior
  event.preventDefault();
  
  // Log to error tracking if available
  if (typeof window !== 'undefined' && (window as any).errorTracker) {
    (window as any).errorTracker.captureException(event.reason);
  }
});

// Simple QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);