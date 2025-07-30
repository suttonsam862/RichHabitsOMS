import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import error handling fixes
import './lib/viteHmrFix'
import './lib/globalFetchInterceptor'
import './lib/fixWebSocketError'

// Minimal error handling - only suppress known development noise
const devErrorPatterns = [
  'vite',
  'hmr',
  'websocket',
  'server connection lost',
  '0.0.0.0',
  'polling for restart',
  'connecting...'
];

// Simplified unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = (event.reason?.message || event.reason?.toString() || '').toLowerCase();

  // Only suppress known development noise in dev mode
  if (import.meta.env.DEV) {
    const isDevNoise = devErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );

    if (isDevNoise) {
      event.preventDefault(); // Prevent console spam
      return;
    }
  }

  // Let real errors through for proper handling by React
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)