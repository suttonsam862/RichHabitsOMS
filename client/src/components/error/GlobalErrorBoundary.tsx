import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Global Error Boundary for top-level application errors
 * Provides comprehensive error logging and user-friendly fallback UI
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: GlobalErrorBoundary.prototype.generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error with comprehensive details
    this.logError(error, errorInfo);
  }

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.retryCount
    };

    // Console logging for development
    console.group(`🚨 Global Error Boundary - ${this.state.errorId}`);
    console.error('Error Details:', errorDetails);
    console.error('Original Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Replace with your error tracking service (Sentry, LogRocket, etc.)
      this.sendErrorToService(errorDetails);
    }

    // Emit custom event for error tracking
    window.dispatchEvent(new CustomEvent('global-error', {
      detail: errorDetails
    }));
  }

  private sendErrorToService(errorDetails: any) {
    try {
      // Example: Send to error tracking service
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails)
      }).catch(err => {
        console.error('Failed to send error to tracking service:', err);
      });
    } catch (err) {
      console.error('Error tracking service failed:', err);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: this.generateErrorId()
      });
    } else {
      // Max retries reached, reload the page
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const bugReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Copy to clipboard for easy bug reporting
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        alert('Bug report copied to clipboard! Please send this to support.');
      })
      .catch(() => {
        // Fallback: open email client
        const subject = `Bug Report - ${this.state.errorId}`;
        const body = `Please describe what you were doing when this error occurred:\n\n\nError Details:\n${JSON.stringify(bugReport, null, 2)}`;
        window.location.href = `mailto:support@threadcraft.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default comprehensive error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-black/40 backdrop-blur-xl border-red-500/20 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-white">
                Something went wrong
              </CardTitle>
              <p className="text-gray-300 mt-2">
                We encountered an unexpected error. Our team has been notified.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Error ID: <code className="bg-gray-800 px-2 py-1 rounded">{this.state.errorId}</code>
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRetry}
                  disabled={this.retryCount >= this.maxRetries}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.retryCount >= this.maxRetries ? 'Max Retries Reached' : `Try Again (${this.maxRetries - this.retryCount} left)`}
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
                
                <Button 
                  onClick={this.handleReportBug}
                  variant="outline"
                  className="border-orange-600 text-orange-400 hover:bg-orange-900/20"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {/* Error Details for Development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6">
                  <summary className="text-gray-400 text-sm cursor-pointer hover:text-white mb-3">
                    🔧 Development Details
                  </summary>
                  <div className="space-y-3">
                    <div className="p-3 bg-red-900/20 rounded border border-red-800/30">
                      <h4 className="font-semibold text-red-400 mb-2">Error Message</h4>
                      <p className="text-red-300 text-sm font-mono">{this.state.error.message}</p>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="p-3 bg-gray-900/50 rounded border border-gray-700">
                        <h4 className="font-semibold text-gray-300 mb-2">Stack Trace</h4>
                        <pre className="text-xs text-gray-400 overflow-auto whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {this.state.errorInfo && (
                      <div className="p-3 bg-blue-900/20 rounded border border-blue-800/30">
                        <h4 className="font-semibold text-blue-400 mb-2">Component Stack</h4>
                        <pre className="text-xs text-blue-300 overflow-auto whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* User Help */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded border border-gray-700">
                <h4 className="font-semibold text-gray-300 mb-2">What you can do:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Contact support if the problem persists</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;