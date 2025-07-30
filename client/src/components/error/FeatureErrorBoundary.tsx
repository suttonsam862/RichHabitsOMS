import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onRetry?: () => void;
  onBack?: () => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

/**
 * Feature-level Error Boundary for specific components/pages
 * Provides targeted error handling for critical features
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: this.generateErrorId(),
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: this.generateErrorId()
    });

    this.logFeatureError(error, errorInfo);
  }

  private generateErrorId(): string {
    // Get current location path, handle cases where location might not be available
    const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/unknown';
    
    // Create a path identifier by removing slashes and using only alphanumeric characters
    const pathId = pathname.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'ROOT';
    
    // Generate unique ID combining feature, path, timestamp, and random component
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 8);
    
    return `${this.props.featureName.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${pathId}-${timestamp}-${randomId}`;
  }

  private logFeatureError(error: Error, errorInfo: ErrorInfo) {
    const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/unknown';
    
    const errorDetails = {
      feature: this.props.featureName,
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      pathname: pathname,
      userAgent: typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : 'Unknown'
    };

    console.group(`🚨 Feature Error: ${this.props.featureName}`);
    console.error('Error Details:', errorDetails);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // Emit event for error tracking
    window.dispatchEvent(new CustomEvent('feature-error', {
      detail: errorDetails
    }));

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendFeatureErrorToService(errorDetails);
    }
  }

  private sendFeatureErrorToService(errorDetails: any) {
    try {
      fetch('/api/errors/feature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails)
      }).catch(err => {
        console.error('Failed to send feature error to service:', err);
      });
    } catch (err) {
      console.error('Feature error tracking failed:', err);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: this.generateErrorId(),
        retryCount: prevState.retryCount + 1
      }));
      
      // Call custom retry handler if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  private handleBack = () => {
    if (this.props.onBack) {
      this.props.onBack();
    } else {
      // Default back behavior
      window.history.back();
    }
  };

  private handleCopyErrorId = async () => {
    try {
      await navigator.clipboard.writeText(this.state.errorId);
      // Show toast notification if available
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          message: 'Error ID copied to clipboard',
          type: 'success'
        }
      }));
    } catch (err) {
      console.error('Failed to copy error ID:', err);
      // Fallback: show alert
      alert(`Error ID: ${this.state.errorId}`);
    }
  };

  private getRetryMessage(): string {
    const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/unknown';
    const remainingRetries = this.maxRetries - this.state.retryCount;
    
    if (remainingRetries <= 0) {
      return 'Max Retries Reached';
    }
    
    if (this.state.retryCount === 0) {
      return `Try Again (${remainingRetries} attempts left)`;
    }
    
    return `Retry ${this.state.retryCount + 1} (${remainingRetries} left)`;
  }

  private getPathFriendlyName(): string {
    const pathname = typeof window !== 'undefined' && window.location ? window.location.pathname : '/unknown';
    
    // Convert common paths to friendly names
    const pathMappings: { [key: string]: string } = {
      '/': 'Dashboard',
      '/orders': 'Orders',
      '/catalog': 'Catalog',
      '/customers': 'Customers',
      '/manufacturing': 'Manufacturing',
      '/admin': 'Admin Panel',
      '/orders/create': 'Order Creation',
      '/orders/enhanced': 'Enhanced Orders'
    };
    
    return pathMappings[pathname] || pathname.split('/').pop() || 'Unknown Page';
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default feature error UI
      return (
        <div className="p-6 space-y-4">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <span className="font-semibold">{this.props.featureName}</span> on <span className="font-medium">{this.getPathFriendlyName()}</span> encountered an error and couldn't load properly.
              {this.state.retryCount > 0 && (
                <span className="block mt-1 text-sm">
                  Retry attempt {this.state.retryCount} of {this.maxRetries} failed.
                </span>
              )}
            </AlertDescription>
          </Alert>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Feature Unavailable
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>The <strong>{this.props.featureName}</strong> feature is temporarily unavailable due to an unexpected error.</p>
                <div className="mt-3 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded border">
                  <span className="text-xs text-gray-500">Error ID:</span>
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono flex-1 min-w-0 truncate">
                    {this.state.errorId}
                  </code>
                  <Button
                    onClick={this.handleCopyErrorId}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Copy Error ID"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= this.maxRetries}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {this.getRetryMessage()}
                </Button>
                
                <Button 
                  onClick={this.handleBack}
                  variant="outline"
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>

              {/* Troubleshooting Tips */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                <h4 className="font-medium text-sm mb-2">Troubleshooting Steps:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {this.state.retryCount === 0 ? (
                    <>
                      <li>• Click "Try Again" to retry loading the {this.props.featureName}</li>
                      <li>• Check your internet connection</li>
                      <li>• Ensure you're still logged in</li>
                    </>
                  ) : this.state.retryCount < this.maxRetries ? (
                    <>
                      <li>• Wait a moment before retrying</li>
                      <li>• Check if other features are working</li>
                      <li>• Refresh your browser if needed</li>
                    </>
                  ) : (
                    <>
                      <li>• Refresh the entire page (Ctrl+R or Cmd+R)</li>
                      <li>• Try navigating away and back to this page</li>
                      <li>• Clear browser cache if the issue persists</li>
                      <li>• Contact support with the Error ID if needed</li>
                    </>
                  )}
                </ul>
                {this.state.retryCount >= this.maxRetries && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Maximum retry attempts reached. Please try refreshing the page or contact support.
                    </p>
                  </div>
                )}
              </div>

              {/* Development Error Details */}
              {(process.env.NODE_ENV === 'development' || this.props.showErrorDetails) && this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    🔧 Technical Details
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                      <h5 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">Error Message</h5>
                      <p className="text-xs text-red-700 dark:text-red-300 font-mono">{this.state.error.message}</p>
                    </div>
                    
                    {this.state.error.stack && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm mb-1">Stack Trace</h5>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;