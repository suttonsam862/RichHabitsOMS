import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./lib/errorHandler";
import "./utils/resizeObserverFix";
import "./index.css";

// Simple error handler for development
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const errorMessage = event.reason?.message || '';
    const errorStack = event.reason?.stack || '';
    
    // Only suppress specific Vite HMR errors, allow other errors to be visible
    const isViteHmrError = (
      errorStack.includes('@vite/client') ||
      errorStack.includes('vite-dev-server') ||
      (errorMessage.includes('Failed to fetch') && errorStack.includes('ping'))
    );
    
    if (isViteHmrError) {
      event.preventDefault();
      return;
    }
    
    // Log other errors for debugging
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);