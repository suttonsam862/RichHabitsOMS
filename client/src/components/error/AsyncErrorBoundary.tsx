import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

/**
 * Async Error Boundary for handling async operation errors
 * Provides loading states and retry functionality
 */
export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error });
    
    // Log async errors
    console.group(`🔄 Async Error: ${this.props.componentName || 'Unknown Component'}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // Emit event for async error tracking
    window.dispatchEvent(new CustomEvent('async-error', {
      detail: {
        component: this.props.componentName,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }
    }));
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private handleRetry = async () => {
    this.setState({ isRetrying: true });

    // Delay retry for better UX
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false
      });

      // Call custom retry handler
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, 1000);
  };

  render() {
    if (this.state.hasError) {
      // Show retrying state
      if (this.state.isRetrying) {
        return (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Retrying...</span>
            </div>
          </div>
        );
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default async error UI
      return (
        <Alert className="my-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Failed to load {this.props.componentName || 'content'}</p>
                <p className="text-sm mt-1 text-orange-700 dark:text-orange-300">
                  {this.state.error?.message || 'An unexpected error occurred during loading.'}
                </p>
              </div>
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;