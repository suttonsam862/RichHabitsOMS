
/**
 * MASTER ERROR HANDLER - Single source of truth for all error handling
 * Replaces all other error handling systems to prevent conflicts
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

export interface StructuredError {
  id: string;
  type: 'network' | 'api' | 'auth' | 'validation' | 'unknown';
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class MasterErrorHandler {
  private errors: StructuredError[] = [];
  private isDevelopment = import.meta.env.DEV;
  private maxErrors = 100;
  private suppressedCount = 0;

  constructor() {
    this.setupComprehensiveErrorHandling();
    this.setupFetchInterception();
    this.setupWebSocketFixes();
  }

  private setupComprehensiveErrorHandling() {
    // Master unhandled rejection handler - catches EVERYTHING
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;

      // AGGRESSIVE empty rejection detection
      if (this.isEmptyRejection(reason)) {
        event.preventDefault();
        this.suppressedCount++;
        if (this.suppressedCount % 50 === 0) {
          console.debug(`🔇 Suppressed ${this.suppressedCount} empty rejections`);
        }
        return;
      }

      // Development-specific noise suppression
      if (this.isDevelopment && this.isDevelopmentNoise(reason)) {
        event.preventDefault();
        return;
      }

      // Auth-related rejections suppression (prevents loops)
      if (this.isAuthRelatedRejection(reason)) {
        event.preventDefault();
        return;
      }

      // Network/fetch errors that are expected
      if (this.isExpectedNetworkError(reason)) {
        event.preventDefault();
        return;
      }

      // Only log truly meaningful errors
      const error = this.processError(reason, {
        component: 'Global',
        action: 'unhandledRejection',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      this.logError(error);
      
      if (error.severity === 'critical') {
        this.showUserNotification(error);
      }
    });

    // JavaScript error handler
    window.addEventListener('error', (event) => {
      // Suppress Vite HMR and development noise
      if (this.isDevelopment && this.isViteError(event)) {
        event.preventDefault();
        return;
      }

      const error = this.processError(event.error || event.message, {
        component: 'Global',
        action: 'javascriptError',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      this.logError(error);
      
      if (error.severity === 'critical') {
        this.showUserNotification(error);
      }
    });
  }

  private isEmptyRejection(reason: any): boolean {
    if (!reason) return true;
    if (reason === null || reason === undefined) return true;
    if (reason === '') return true;
    if (String(reason).trim() === '') return true;
    if (String(reason).trim() === 'undefined') return true;
    if (String(reason).trim() === 'null') return true;
    
    // Empty objects
    if (typeof reason === 'object') {
      if (Array.isArray(reason) && reason.length === 0) return true;
      if (Object.keys(reason).length === 0) return true;
      if (JSON.stringify(reason) === '{}') return true;
      if (JSON.stringify(reason) === '[]') return true;
      
      // Check for objects with only empty properties
      try {
        const values = Object.values(reason);
        if (values.length === 0) return true;
        if (values.every(v => !v || String(v).trim() === '')) return true;
      } catch {
        return true;
      }
    }

    return false;
  }

  private isDevelopmentNoise(reason: any): boolean {
    if (!this.isDevelopment) return false;

    const reasonString = String(reason?.message || reason || '').toLowerCase();
    
    return (
      reasonString.includes('_vite_ping') ||
      reasonString.includes('[vite] server connection lost') ||
      reasonString.includes('hmr') ||
      reasonString.includes('websocket') ||
      reasonString.includes('0.0.0.0') ||
      reasonString.includes('econnrefused') ||
      reasonString.includes('enotfound') ||
      reasonString.includes('connection refused') ||
      reasonString.includes('network error') ||
      reasonString.includes('chunk load error') ||
      reasonString.includes('loading chunk')
    );
  }

  private isAuthRelatedRejection(reason: any): boolean {
    const reasonString = String(reason?.message || reason || '').toLowerCase();
    
    return (
      reasonString.includes('not authenticated') ||
      reasonString.includes('unauthorized') ||
      reasonString.includes('authentication required') ||
      reasonString.includes('auth') && reasonString.includes('failed') ||
      reasonString.includes('401') ||
      reasonString.includes('403') ||
      reasonString.includes('no user in session') ||
      reasonString.includes('session expired') ||
      reasonString.includes('invalid token') ||
      reasonString.includes('access denied')
    );
  }

  private isExpectedNetworkError(reason: any): boolean {
    const reasonString = String(reason?.message || reason || '').toLowerCase();
    
    return (
      reasonString.includes('failed to fetch') ||
      reasonString.includes('networkerror') ||
      reasonString.includes('fetch error') ||
      reasonString.includes('connection') && reasonString.includes('failed') ||
      reasonString.includes('timeout') ||
      reasonString.includes('aborted')
    );
  }

  private isViteError(event: ErrorEvent): boolean {
    const message = String(event.message || '').toLowerCase();
    const source = String(event.filename || '').toLowerCase();
    
    return (
      message.includes('vite') ||
      message.includes('hmr') ||
      source.includes('vite') ||
      source.includes('@vite') ||
      source.includes('node_modules')
    );
  }

  private setupFetchInterception() {
    // Lightweight fetch wrapper to catch common network issues
    const originalFetch = window.fetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : 
                  input instanceof URL ? input.toString() : 
                  (input as Request).url;

      // Handle Vite HMR ping requests
      if (url.includes('0.0.0.0') && url.includes('@vite')) {
        const rewrittenUrl = url.replace(/https?:\/\/0\.0\.0\.0:\d+/, window.location.origin);
        try {
          return await originalFetch(rewrittenUrl, init);
        } catch (error) {
          // Silently fail HMR pings
          throw new Error('HMR_PING_FAILED_SUPPRESSED');
        }
      }

      try {
        const response = await originalFetch(input, init);
        
        // Don't log expected 401s from auth checks
        if (!response.ok && response.status === 401 && url.includes('/api/auth/me')) {
          // This is expected, don't create noise
        }

        return response;
      } catch (error) {
        // Only log unexpected fetch failures
        if (!url.includes('/api/auth/me') && 
            !url.includes('/api/health') && 
            !url.includes('_vite_ping')) {
          console.debug('🌐 Fetch failed (suppressed):', url);
        }
        throw error;
      }
    };
  }

  private setupWebSocketFixes() {
    // Mock WebSocket for failed connections to prevent spam
    if (this.isDevelopment) {
      const OriginalWebSocket = window.WebSocket;
      
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          try {
            super(url, protocols);
          } catch (error) {
            // Create a mock WebSocket that doesn't spam errors
            const mockSocket = {
              readyState: 3, // CLOSED
              close: () => {},
              send: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false
            };
            return mockSocket as any;
          }
        }
      };
    }
  }

  private processError(rawError: any, context: ErrorContext): StructuredError {
    const id = this.generateErrorId();
    let type: StructuredError['type'] = 'unknown';
    let severity: StructuredError['severity'] = 'medium';
    let message = 'An unexpected error occurred';

    if (rawError) {
      const errorString = String(rawError.message || rawError).toLowerCase();
      
      if (errorString.includes('fetch') || 
          errorString.includes('network') || 
          errorString.includes('connection') ||
          rawError.status >= 500) {
        type = 'network';
        severity = 'medium';
        message = 'Network connection issue. Please check your internet connection.';
      }
      else if (errorString.includes('api') || 
               rawError.status >= 400) {
        type = 'api';
        severity = rawError.status === 401 || rawError.status === 403 ? 'high' : 'medium';
        message = rawError.status === 401 ? 'Authentication required. Please log in again.' :
                  rawError.status === 403 ? 'Access denied. You don\'t have permission for this action.' :
                  'Server error. Please try again later.';
      }
      else if (errorString.includes('auth') || 
               errorString.includes('token') || 
               errorString.includes('unauthorized')) {
        type = 'auth';
        severity = 'high';
        message = 'Authentication error. Please log in again.';
      }
      else if (errorString.includes('validation') || 
               errorString.includes('required') || 
               errorString.includes('invalid')) {
        type = 'validation';
        severity = 'low';
        message = 'Please check your input and try again.';
      }
      else if (rawError.message && rawError.message.length < 100) {
        message = rawError.message;
      }
    }

    return {
      id,
      type,
      message,
      stack: rawError?.stack,
      context,
      severity
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(error: StructuredError) {
    this.errors.unshift(error);
    
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    if (this.isDevelopment) {
      console.group(`🚨 Error [${error.severity.toUpperCase()}] - ${error.type}`);
      console.error('Message:', error.message);
      console.error('Context:', error.context);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      console.groupEnd();
    } else {
      console.error(JSON.stringify({
        errorId: error.id,
        type: error.type,
        message: error.message,
        severity: error.severity,
        timestamp: error.context.timestamp,
        url: error.context.url,
        component: error.context.component,
        action: error.context.action
      }));
    }
  }

  private showUserNotification(error: StructuredError) {
    try {
      const toastEvent = new CustomEvent('showToast', {
        detail: {
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        }
      });
      window.dispatchEvent(toastEvent);
    } catch {
      if ('Notification' in window) {
        new Notification('ThreadCraft Error', {
          body: error.message,
          icon: '/favicon.ico'
        });
      }
    }
  }

  // Public methods
  public reportError(error: any, context: Partial<ErrorContext> = {}) {
    const fullContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    };

    const structuredError = this.processError(error, fullContext);
    this.logError(structuredError);
    
    return structuredError;
  }

  public getErrors(): StructuredError[] {
    return [...this.errors];
  }

  public clearErrors() {
    this.errors = [];
  }

  public getSuppressionStats() {
    return {
      suppressedCount: this.suppressedCount,
      loggedErrors: this.errors.length
    };
  }
}

// Global error handler instance
export const errorHandler = new MasterErrorHandler();

// Utility functions
export const reportError = (error: any, context?: Partial<ErrorContext>) => 
  errorHandler.reportError(error, context);

export const getSuppressionStats = () => errorHandler.getSuppressionStats();
