import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
// Initialize error handling with simplified approach
import "./lib/errorHandler";
import "./index.css";

// Add global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Filter out Vite dev server ping errors to reduce spam
  const isVitePingError = (event.reason?.stack?.includes('@vite/client') && 
                          event.reason?.message?.includes('Failed to fetch')) ||
                         (event.reason?.stack?.includes('ping') && 
                          event.reason?.message?.includes('Failed to fetch')) ||
                         (event.reason?.name === 'TypeError' && 
                          event.reason?.message === 'Failed to fetch' &&
                          event.reason?.stack?.includes('waitForSuccessfulPing'));
  
  if (isVitePingError) {
    // Silent prevention for Vite dev server ping errors
    event.preventDefault();
    return;
  }
  
  // Log other promise rejections with full details
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