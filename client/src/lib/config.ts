/**
 * Configuration for API base URLs and environment settings
 */

// Determine the correct API base URL based on environment
export const getApiBaseUrl = (): string => {
  // In development with Replit, both frontend and backend run on the same domain
  // The Express server serves both the API routes and the Vite-built frontend
  return '';
};

// Export the base URL for use throughout the app
export const API_BASE_URL = getApiBaseUrl();

// Development environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Replit environment detection
export const isReplit = typeof window !== 'undefined' && 
  window.location.hostname.includes('replit.dev');

// WebSocket configuration for Replit
export const getWebSocketConfig = () => {
  if (isReplit) {
    return {
      host: window.location.hostname,
      port: window.location.port || '443',
      secure: window.location.protocol === 'https:'
    };
  }
  
  return {
    host: 'localhost',
    port: '5173',
    secure: false
  };
};