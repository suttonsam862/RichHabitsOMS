import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import error handling first
import './lib/viteHmrFix'
import './lib/globalFetchInterceptor'
import './lib/fixWebSocketError'

// Enhanced unhandled rejection handler with filtering
let rejectionCount = 0;
const MAX_REJECTION_LOGS = 50; // Temporarily increased for debugging
const ignoredErrorMessages = [
  'server not ready',
  'rate limited',
  'websocket connection',
  'failed to fetch',
  'network error',
  'load failed',
  'vite hmr ping failed',
  '0.0.0.0 requests blocked',
  'not authenticated'
];

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMessage = (error?.message || error?.toString() || '').toLowerCase();

  // Filter out expected errors during development
  if (import.meta.env.DEV) {
    const shouldIgnore = ignoredErrorMessages.some(ignored => 
      errorMessage.includes(ignored)
    ) || errorMessage.includes('0.0.0.0') || 
       errorMessage.includes('hmr') ||
       errorMessage.includes('vite') ||
       (errorMessage === '' || errorMessage === 'undefined' || errorMessage === 'null');

    if (shouldIgnore) {
      rejectionCount++;

      // Log only first few rejections to avoid spam
      if (rejectionCount <= MAX_REJECTION_LOGS) {
        console.debug(`🚫 Dev error suppressed (${rejectionCount}/${MAX_REJECTION_LOGS})`);

        if (rejectionCount === MAX_REJECTION_LOGS) {
          console.debug('🔇 Development error suppression active');
        }
      }

      // Prevent the error from appearing in console
      event.preventDefault();
      return;
    }
  }

  // Log real unhandled rejections
  console.error('🚨 Unhandled Promise Rejection:', error);

  // In production, you might want to send this to an error reporting service
  if (import.meta.env.PROD) {
    // TODO: Send to error reporting service
  }
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  const errorMessage = event.message.toLowerCase();

  // Filter out development noise
  if (import.meta.env.DEV) {
    const shouldIgnore = ignoredErrorMessages.some(ignored => 
      errorMessage.includes(ignored)
    );

    if (shouldIgnore) {
      console.warn('🚫 Filtered error:', event.message);
      event.preventDefault();
      return;
    }
  }

  console.error('🚨 Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)