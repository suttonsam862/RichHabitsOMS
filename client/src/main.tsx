import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// NUCLEAR ERROR SUPPRESSION - Import first to catch everything
import './lib/errorHandler.ts'

// Nuclear suppression for immediate effect
if (import.meta.env.DEV) {
  // Override console.error in development to reduce noise
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = String(args[0] || '').toLowerCase();
    // Only log truly critical errors in development
    if (message.includes('syntax') || 
        message.includes('reference') || 
        (message.includes('type') && !message.includes('fetch'))) {
      originalError(...args);
    }
  };

  // Suppress unhandled promise rejections immediately
  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)