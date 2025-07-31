import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import fixes
import './lib/viteHmrFix'

// Simple error handling for development
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = String(event.reason?.message || event.reason || '').toLowerCase();

  // Only suppress known development noise
  if (import.meta.env.DEV && (
    errorMessage.includes('vite') ||
    errorMessage.includes('hmr') ||
    errorMessage.includes('0.0.0.0') ||
    errorMessage.includes('websocket')
  )) {
    event.preventDefault();
    return;
  }

  // Log real errors
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)