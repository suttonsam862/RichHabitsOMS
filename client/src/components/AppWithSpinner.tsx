import React from "react";
import { BrowserRouter } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { MainDashboardRouter } from "./auth/MainDashboardRouter";
import { GlobalSpinner } from "./ui/global-spinner";
import { useAuth } from "@/hooks/use-auth";
import { FeatureErrorBoundary } from "./error/FeatureErrorBoundary";

export function AppWithSpinner() {
  const { loading } = useAuth();
  const [initError, setInitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Monitor for initialization errors
    const handleError = (event: any) => {
      if (event.type === 'unhandledrejection' || event.type === 'error') {
        setInitError('Application initialization failed. Please refresh the page.');
      }
    };

    window.addEventListener('unhandledrejection', handleError);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleError);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-red-400 text-xl font-medium">
            {initError}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <GlobalSpinner />;
  }

  return (
    <BrowserRouter>
      <FeatureErrorBoundary featureName="Main Application">
        <RequireAuth>
          <MainDashboardRouter />
        </RequireAuth>
      </FeatureErrorBoundary>
    </BrowserRouter>
  );
}