/**
 * Enhanced WebSocket connection fix for Replit environments
 * Addresses Vite HMR connection polling issues and console spam
 */

// Utility to detect development environment
const isDevelopment = (): boolean => {
  return import.meta.env?.DEV || process.env.NODE_ENV === 'development';
};

export const fixWebSocketConnection = () => {
  if (typeof window !== 'undefined') {
    // Only apply comprehensive error suppression in development
    if (isDevelopment()) {
      setupDevelopmentErrorSuppression();
    }

    // Always setup WebSocket improvements
    setupWebSocketImprovements();
  }
};

function setupDevelopmentErrorSuppression() {
  // Handle unhandled promise rejections more intelligently
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;

    // Only suppress specific development-related errors
    if (reason && (
        // Vite HMR errors
        reason.message?.includes('_vite_ping') ||
        reason.message?.includes('[vite] server connection lost') ||
        reason.message?.includes('HMR') ||
        reason.message?.includes('WebSocket') ||

        // Network errors that are expected in development
        (reason.message?.includes('Failed to fetch') && isDevelopmentEndpoint(reason)) ||
        (reason.message?.includes('NetworkError') && isDevelopmentEndpoint(reason)) ||

        // Empty or meaningless errors
        reason === '' ||
        (typeof reason === 'object' && Object.keys(reason).length === 0) ||
        String(reason).trim() === ''
    )) {
      // Suppress these errors in development
      event.preventDefault();

      // Log to console only in verbose debug mode
      if (import.meta.env.VITE_DEBUG_VERBOSE) {
        console.debug('Suppressed development error:', reason);
      }
      return;
    }

    // Allow all other errors to be handled normally
    console.error('🚨 Unhandled Promise Rejection:', reason);

    // Structure error information for debugging
    const errorInfo = {
      type: 'unhandledrejection',
      reason: reason?.message || reason,
      stack: reason?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Only log detailed info for non-auth errors to avoid spam
    if (!reason?.message?.includes('auth') && !reason?.message?.includes('401')) {
      console.error('Error details:', errorInfo);
    }

    // Clean up auth errors gracefully
    if (reason?.message?.includes('auth') || 
        reason?.message?.includes('token') ||
        reason?.message?.includes('401')) {
      console.log('Authentication error detected, clearing invalid session');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
    }
  });
}

function isDevelopmentEndpoint(reason: any): boolean {
  const message = reason?.message || '';
  const url = reason?.url || '';

  return message.includes('localhost') ||
         message.includes('127.0.0.1') ||
         url.includes('localhost') ||
         url.includes('127.0.0.1') ||
         message.includes('_vite_ping');
}

function setupWebSocketImprovements() {
  // Store the original WebSocket constructor
  const OriginalWebSocket = window.WebSocket;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 2; // Reduced from 3

  // Create a proxy constructor that intercepts WebSocket creation
  window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
    let urlString = typeof url === 'string' ? url : url.toString();

    // Detect if this is a Vite HMR WebSocket
    const isViteHmr = urlString.includes('ws://') || 
                     urlString.includes('wss://') ||
                     urlString.includes('_vite_ping') ||
                     urlString.includes('hmr');

    // Rate limit HMR connections in development
    if (isViteHmr && isDevelopment() && connectionAttempts >= maxConnectionAttempts) {
      console.debug('WebSocket connection rate limited for HMR');
      // Return a mock WebSocket that fails immediately
      const mockWs = new OriginalWebSocket('ws://localhost:0');
      setTimeout(() => mockWs.close(), 0);
      return mockWs;
    }

    if (isViteHmr) {
      connectionAttempts++;
      // Reset counter after some time
      setTimeout(() => {
        connectionAttempts = Math.max(0, connectionAttempts - 1);
      }, 10000);
    }

    // Create the actual WebSocket
    const ws = new OriginalWebSocket(url, protocols);

    // Add enhanced error handling for HMR WebSockets
    if (isViteHmr && isDevelopment()) {
      ws.addEventListener('error', (event) => {
        // Suppress HMR WebSocket errors in development
        event.preventDefault();
        event.stopPropagation();

        if (import.meta.env.VITE_DEBUG_VERBOSE) {
          console.debug('WebSocket error suppressed for HMR:', event);
        }
      });

      ws.addEventListener('close', (event) => {
        if (import.meta.env.VITE_DEBUG_VERBOSE) {
          console.debug('WebSocket closed for HMR:', event.code, event.reason);
        }
      });
    }

    return ws;
  } as any;

  // Preserve the original constructor's prototype
  window.WebSocket.prototype = OriginalWebSocket.prototype;
}