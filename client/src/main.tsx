
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";
import { initViteHmrFixes } from "./lib/viteHmrFix";

// Fix WebSocket connections for Replit environment
fixWebSocketConnection();

// Initialize comprehensive Vite HMR fixes
initViteHmrFixes();

// Override console methods to suppress fetch error spam completely
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError') ||
      message.includes('WebSocket') ||
      message.includes('_vite_ping') ||
      message.includes('vite') ||
      message.includes('HMR') ||
      message.includes('hot reload') ||
      message.includes('[vite]') ||
      message.includes('server connection lost') ||
      message.includes('Polling for restart')) {
    return; // Completely suppress these messages
  }
  originalConsoleWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError') ||
      message.includes('WebSocket') ||
      message.includes('_vite_ping') ||
      message.includes('vite') ||
      message.includes('HMR') ||
      message.includes('hot reload') ||
      message.includes('[vite]') ||
      message.includes('server connection lost') ||
      message.includes('Polling for restart')) {
    return; // Completely suppress these messages
  }
  originalConsoleError.apply(console, args);
};

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to fetch') || 
      message.includes('Network request failed') ||
      message.includes('NetworkError') ||
      message.includes('[vite]') ||
      message.includes('server connection lost') ||
      message.includes('Polling for restart')) {
    return; // Completely suppress these messages
  }
  originalConsoleLog.apply(console, args);
};

// Enhanced global error handlers to prevent unhandled promise rejections and Vite connection spam
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // Enhanced suppression for Vite HMR and development errors
  if (reason && (
    // Vite HMR connection errors
    reason.message?.includes('WebSocket') ||
    reason.message?.includes('_vite_ping') ||
    reason.message?.includes('vite') ||
    reason.message?.includes('HMR') ||
    reason.message?.includes('hot reload') ||
    // Network errors
    reason.message?.includes('Failed to fetch') ||
    reason.message?.includes('NetworkError') ||
    reason.message?.includes('Connection refused') ||
    // Auth errors
    reason.message?.includes('401') ||
    reason.message?.includes('403') ||
    reason.message?.includes('404') ||
    // Status codes
    reason.status === 404 ||
    reason.status === 401 ||
    reason.status === 403 ||
    // Error types
    reason.name === 'NetworkError' ||
    reason.name === 'TypeError' ||
    reason.name === 'AbortError'
  )) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
  
  // Complete suppression of empty or null rejections
  if (!reason || 
      (typeof reason === 'object' && Object.keys(reason).length === 0) ||
      reason === '' ||
      String(reason).trim() === '') {
    event.preventDefault();
    event.stopImmediatePropagation();
    return false;
  }
});

window.addEventListener('error', (event) => {
  // Enhanced error suppression for Vite and development issues
  if (
    event.error?.message?.includes('Failed to fetch') ||
    event.error?.message?.includes('WebSocket') ||
    event.error?.message?.includes('_vite_ping') ||
    event.error?.message?.includes('vite') ||
    event.error?.message?.includes('HMR') ||
    event.error?.message?.includes('401') ||
    event.error?.message?.includes('403') ||
    event.error?.message?.includes('404') ||
    event.error?.message?.includes('NetworkError') ||
    event.error?.message?.includes('Connection refused')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error('Global error:', event.error);
  }
});

import { queryClient } from './lib/queryClient';

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
