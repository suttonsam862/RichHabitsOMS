
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
// Initialize global fetch spam prevention ASAP
import "./lib/globalFetchInterceptor";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";
import { initViteHmrFixes } from "./lib/viteHmrFix";
import { errorHandler } from "./lib/errorHandler";
import { toastEventHandler } from "./lib/toastEventHandler";

// Utility to check development environment
const isDevelopment = (): boolean => {
  return import.meta.env.DEV || process.env.NODE_ENV === 'development';
};

// Fix WebSocket connections for Replit environment
fixWebSocketConnection();

// Initialize comprehensive Vite HMR fixes
initViteHmrFixes();

// Initialize comprehensive error handling
errorHandler;

// Initialize toast event handler
toastEventHandler.initialize();

// Global unhandled rejection handler with intelligent filtering
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // In development, suppress known noise but log real errors
  if (isDevelopment()) {
    // Suppress development noise
    if (reason && (
        reason.message?.includes('_vite_ping') ||
        reason.message?.includes('[vite] server connection lost') ||
        reason.message?.includes('WebSocket') ||
        reason.name === 'ThrottledRequest' ||
        reason.name === 'CircuitBreakerOpen' ||
        (reason.message?.includes('Failed to fetch') && 
         (reason.message?.includes('localhost') || reason.message?.includes('127.0.0.1')))
    )) {
      event.preventDefault();
      // Only log in verbose mode
      if (import.meta.env.VITE_DEBUG_VERBOSE) {
        console.debug('🔇 Suppressed development noise:', reason.message || reason);
      }
      return;
    }
  }
  
  // Log real errors with structured information
  console.error('🚨 Unhandled Promise Rejection:', reason);
  
  // Prevent default behavior that might cause cascading errors
  event.preventDefault();
  
  // Log structured error information for debugging
  const errorInfo = {
    type: 'unhandledRejection',
    reason: reason?.message || reason,
    stack: reason?.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    isDevelopment: isDevelopment()
  };
  
  // Only log detailed info for significant errors
  if (reason?.message && !reason.message.includes('auth') && !reason.message.includes('401')) {
    console.error('Error details:', errorInfo);
  }
  
  // Attempt to handle common authentication errors gracefully
  if (reason?.message?.includes('auth') || 
      reason?.message?.includes('token') ||
      reason?.message?.includes('401')) {
    console.log('🔐 Authentication error detected, clearing invalid session');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  }
});

// Handle regular JavaScript errors
window.addEventListener('error', (event) => {
  // Don't spam console with development errors
  if (isDevelopment() && (
      event.message?.includes('_vite_ping') ||
      event.message?.includes('WebSocket') ||
      event.filename?.includes('vite')
  )) {
    if (import.meta.env.VITE_DEBUG_VERBOSE) {
      console.debug('🔇 Suppressed development error:', event.message);
    }
    return;
  }
  
  console.error('🚨 JavaScript Error:', event.error);
  
  const errorInfo = {
    type: 'javascriptError',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    isDevelopment: isDevelopment()
  };
  
  console.error('Error details:', errorInfo);
});

// Enhanced console filtering for development
if (isDevelopment()) {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Filter console errors to reduce noise
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Suppress common development noise
    if (message.includes('_vite_ping') || 
        message.includes('[vite] server connection lost') ||
        message.includes('WebSocket connection to') ||
        message.includes('Failed to establish a connection')) {
      // Only show in verbose debug mode
      if (import.meta.env.VITE_DEBUG_VERBOSE) {
        originalConsoleError.apply(console, ['🔇 [SUPPRESSED]', ...args]);
      }
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    
    // Suppress Vite HMR warnings
    if (message.includes('[vite]') || message.includes('hmr')) {
      if (import.meta.env.VITE_DEBUG_VERBOSE) {
        originalConsoleWarn.apply(console, ['🔇 [SUPPRESSED]', ...args]);
      }
      return;
    }
    
    originalConsoleWarn.apply(console, args);
  };
}

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
