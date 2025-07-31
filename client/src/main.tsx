import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// NUCLEAR ERROR SUPPRESSION - Import first to catch everything
import './lib/errorHandler.ts'

// Targeted error suppression for development
if (import.meta.env.DEV) {
  // Override console.error to reduce noise but allow important errors
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = String(args[0] || '').toLowerCase();
    
    // Suppress known development noise
    if (message.includes('websocket') || 
        message.includes('hmr') ||
        message.includes('vite') ||
        message.includes('failed to fetch') ||
        message.includes('chunk')) {
      return; // Suppress these
    }
    
    // Log important errors
    if (message.includes('syntax') || 
        message.includes('reference') || 
        message.includes('type') ||
        message.includes('component')) {
      originalError(...args);
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)