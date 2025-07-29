
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";

// Fix WebSocket connections for Replit environment
fixWebSocketConnection();

// Global error handlers to prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // Suppress all expected errors and empty objects
  if (
    !reason || // Undefined/null reasons
    reason?.status === 401 || 
    reason?.status === 403 ||
    reason?.message?.includes('401') ||
    reason?.message?.includes('403') ||
    reason?.message?.includes('Failed to fetch') ||
    reason?.message?.includes('NetworkError') ||
    reason?.message?.includes('fetch') ||
    (typeof reason === 'object' && (!reason || Object.keys(reason).length === 0)) || // Empty objects or null objects
    reason === '' || // Empty strings
    String(reason).trim() === '' || // Empty string representations
    JSON.stringify(reason) === '{}' || // Stringify check for empty objects
    JSON.stringify(reason) === 'null' || // Null objects
    JSON.stringify(reason) === '""' // Empty string objects
  ) {
    event.preventDefault();
    return;
  }
  
  // Only log truly unexpected errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled promise rejection:', reason);
  }
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  // Suppress network and auth related errors
  if (
    event.error?.message?.includes('Failed to fetch') ||
    event.error?.message?.includes('401') ||
    event.error?.message?.includes('403') ||
    event.error?.message?.includes('NetworkError')
  ) {
    return;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Global error:', event.error);
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry auth failures or network errors
        if (
          error?.status === 401 || 
          error?.status === 403 ||
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError')
        ) {
          return false;
        }
        return failureCount < 1; // Reduce retry attempts
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Prevent unnecessary refetches
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
  logger: {
    log: () => {}, // Suppress query client logs
    warn: () => {}, // Suppress query client warnings
    error: (error) => {
      // Only log truly unexpected query errors
      if (
        !error?.message?.includes('401') &&
        !error?.message?.includes('403') &&
        !error?.message?.includes('Failed to fetch') &&
        process.env.NODE_ENV === 'development'
      ) {
        console.error('Query error:', error);
      }
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
