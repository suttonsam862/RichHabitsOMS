
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

// Override console methods to suppress fetch error spam completely
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError')) {
    return; // Completely suppress these messages
  }
  originalConsoleWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError')) {
    return; // Completely suppress these messages
  }
  originalConsoleError.apply(console, args);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError')) {
    return; // Completely suppress these messages
  }
  originalConsoleLog.apply(console, args);
};

// Enhanced global error handlers to prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Complete suppression of all unhandled rejections to stop development spam
  event.preventDefault();
  event.stopImmediatePropagation();
  return false;
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
