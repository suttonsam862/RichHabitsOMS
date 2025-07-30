import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  componentName: string;
  fallback?: ReactNode;
  onRetry?: () => void;
  minimal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Component-level Error Boundary for individual UI components
 * Provides minimal error UI for smaller components
 */
export class ComponentErrorBoundary extends Component<Props, State> {
  private maxRetries = 1;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
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
    this.setState({ error });
    
    // Log component errors
    console.warn(`⚠️ Component Error: ${this.props.componentName}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Emit event for component error tracking
    window.dispatchEvent(new CustomEvent('component-error', {
      detail: {
        component: this.props.componentName,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }));
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));
      
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal error UI for small components
      if (this.props.minimal) {
        return (
          <div className="p-2 text-center text-sm text-gray-500 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 rounded">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p>Error loading {this.props.componentName}</p>
            {this.state.retryCount < this.maxRetries && (
              <Button 
                onClick={this.handleRetry}
                variant="ghost"
                size="sm"
                className="mt-1 h-6 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        );
      }

      // Default component error UI
      return (
        <Alert className="my-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Component Error</p>
                <p className="text-xs mt-1 text-red-700 dark:text-red-300">
                  {this.props.componentName} failed to render
                </p>
              </div>
              {this.state.retryCount < this.maxRetries && (
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="ml-2 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;