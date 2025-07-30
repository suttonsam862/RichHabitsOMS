
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

// Fix WebSocket connections for Replit environment
fixWebSocketConnection();

// Initialize comprehensive Vite HMR fixes
initViteHmrFixes();

// Initialize comprehensive error handling
errorHandler;

// Initialize toast event handler
toastEventHandler.initialize();

// Minimal console filtering for development
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // Only suppress Vite HMR noise, not application errors
  if (message.includes('_vite_ping') || message.includes('[vite] server connection lost')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

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
