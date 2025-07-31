// Centralized error handling that respects authentication flows
interface ErrorContext {
  url?: string;
  method?: string;
  status?: number;
  isAuthRelated?: boolean;
}

class ErrorHandler {
  private errorCount = 0;
  private readonly MAX_ERRORS_PER_MINUTE = 10;
  private readonly ERROR_RESET_INTERVAL = 60000; // 1 minute

  constructor() {
    // Reset error count periodically
    setInterval(() => {
      this.errorCount = 0;
    }, this.ERROR_RESET_INTERVAL);

    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, { 
        isAuthRelated: this.isAuthError(event.reason) 
      });
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, { 
        isAuthRelated: this.isAuthError(event.error) 
      });
    });
  }

  private isAuthError(error: any): boolean {
    if (!error) return false;

    const errorString = error.toString?.() || String(error);
    const authKeywords = [
      'auth',
      'login',
      'token',
      'unauthorized',
      '401',
      'authentication',
      'session'
    ];

    return authKeywords.some(keyword => 
      errorString.toLowerCase().includes(keyword)
    );
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;

    const errorString = error.toString?.() || String(error);
    const networkKeywords = [
      'fetch',
      'NetworkError',
      'Failed to fetch',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ];

    return networkKeywords.some(keyword => 
      errorString.toLowerCase().includes(keyword)
    );
  }

  handleError(error: any, context: ErrorContext = {}) {
    // Rate limit error handling
    if (this.errorCount >= this.MAX_ERRORS_PER_MINUTE) {
      return;
    }
    this.errorCount++;

    // Don't log expected auth-related errors during login flows
    if (context.isAuthRelated || this.isAuthError(error)) {
      // Only log unexpected auth errors
      if (context.status && context.status !== 401) {
        console.warn('Unexpected auth error:', error, context);
      }
      return;
    }

    // Don't log common network errors that are expected
    if (this.isNetworkError(error)) {
      return;
    }

    // Don't log errors from health checks or monitoring
    if (context.url?.includes('/api/health') || 
        context.url?.includes('/api/auth/me')) {
      return;
    }

    // Only log truly unexpected errors
    console.error('🚨 Application Error:', error, context);
  }

  // Method for components to report errors with context
  reportError(error: any, context: ErrorContext = {}) {
    this.handleError(error, context);
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

// Export for manual error reporting
export const reportError = (error: any, context: ErrorContext = {}) => {
  globalErrorHandler.reportError(error, context);
};

// Initialize error handling
export const initializeErrorHandling = () => {
  console.log('✅ Unified error handler initialized');
};