/**
 * Comprehensive Error Handler for ThreadCraft Application
 * Handles all unhandled promise rejections and provides structured error logging
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

class ErrorHandler {
  private errors: StructuredError[] = [];
  private isDevelopment = import.meta.env.DEV;
  private maxErrors = 100;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // TEMPORARY: Enhanced logging for debugging
      console.group('🚨 DETAILED UNHANDLED REJECTION');
      console.error('Raw event.reason:', event.reason);
      console.error('Event.reason type:', typeof event.reason);
      console.error('Event.reason.message:', event.reason?.message);
      console.error('Event.reason.stack:', event.reason?.stack);
      console.error('Event.reason.status:', event.reason?.status);
      console.error('Event.reason.url:', event.reason?.url);
      console.error('Full event object:', event);
      console.error('Timestamp:', new Date().toISOString());
      console.error('Current URL:', window.location.href);
      console.groupEnd();

      const error = this.processError(event.reason, {
        component: 'Global',
        action: 'unhandledRejection',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      // DON'T prevent default behavior temporarily - let errors show
      // event.preventDefault();
      
      // Log structured error
      this.logError(error);
      
      // Show user-friendly notification for critical errors only
      if (error.severity === 'critical') {
        this.showUserNotification(error);
      }
    });

    // Handle regular JavaScript errors
    window.addEventListener('error', (event) => {
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

  private processError(rawError: any, context: ErrorContext): StructuredError {
    const id = this.generateErrorId();
    let type: StructuredError['type'] = 'unknown';
    let severity: StructuredError['severity'] = 'medium';
    let message = 'An unexpected error occurred';

    // Analyze error type and severity
    if (rawError) {
      const errorString = String(rawError.message || rawError).toLowerCase();
      
      // Network errors
      if (errorString.includes('fetch') || 
          errorString.includes('network') || 
          errorString.includes('connection') ||
          rawError.status >= 500) {
        type = 'network';
        severity = 'medium';
        message = 'Network connection issue. Please check your internet connection.';
      }
      // API errors
      else if (errorString.includes('api') || 
               rawError.status >= 400) {
        type = 'api';
        severity = rawError.status === 401 || rawError.status === 403 ? 'high' : 'medium';
        message = rawError.status === 401 ? 'Authentication required. Please log in again.' :
                  rawError.status === 403 ? 'Access denied. You don\'t have permission for this action.' :
                  'Server error. Please try again later.';
      }
      // Authentication errors
      else if (errorString.includes('auth') || 
               errorString.includes('token') || 
               errorString.includes('unauthorized')) {
        type = 'auth';
        severity = 'high';
        message = 'Authentication error. Please log in again.';
      }
      // Validation errors
      else if (errorString.includes('validation') || 
               errorString.includes('required') || 
               errorString.includes('invalid')) {
        type = 'validation';
        severity = 'low';
        message = 'Please check your input and try again.';
      }
      // Use original message if it's user-friendly
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
    // Add to error collection
    this.errors.unshift(error);
    
    // Maintain max errors limit
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Development logging
    if (this.isDevelopment) {
      console.group(`🚨 Error [${error.severity.toUpperCase()}] - ${error.type}`);
      console.error('Message:', error.message);
      console.error('Context:', error.context);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
      console.groupEnd();
    } else {
      // Production logging (structured for monitoring)
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
    // Try to use existing toast system
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
      // Fallback to browser notification
      if ('Notification' in window) {
        new Notification('ThreadCraft Error', {
          body: error.message,
          icon: '/favicon.ico'
        });
      }
    }
  }

  // Public methods for manual error reporting
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

  // Utility for wrapping async functions
  public async safeAsync<T>(
    fn: () => Promise<T>, 
    context: Partial<ErrorContext> = {}
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.reportError(error, context);
      return null;
    }
  }

  // Utility for wrapping fetch calls
  public async safeFetch(
    url: string, 
    options: RequestInit = {},
    context: Partial<ErrorContext> = {}
  ): Promise<Response | null> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      this.reportError(error, {
        ...context,
        action: 'fetch',
        component: context.component || 'HTTP Client'
      });
      return null;
    }
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Utility functions for easy use in components
export const reportError = (error: any, context?: Partial<ErrorContext>) => 
  errorHandler.reportError(error, context);

export const safeAsync = <T>(fn: () => Promise<T>, context?: Partial<ErrorContext>) => 
  errorHandler.safeAsync(fn, context);

export const safeFetch = (url: string, options?: RequestInit, context?: Partial<ErrorContext>) => 
  errorHandler.safeFetch(url, options, context);