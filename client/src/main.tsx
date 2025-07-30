
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { fixWebSocketConnection } from "./lib/fixWebSocketError";
import { initViteHmrFixes } from "./lib/viteHmrFix";
import { errorHandler } from "./lib/errorHandler";
import { toastEventHandler } from "./lib/toastEventHandler";

// Fix WebSocket connections for Replit environment
fixWebSocketConnection();

// Initialize comprehensive Vite HMR fixes
initViteHmrFixes();

// Initialize comprehensive error handling
errorHandler;

// Initialize toast event handler
toastEventHandler.initialize();

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

// Note: Global error handlers are now managed by the comprehensive errorHandler

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
