import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./context/AuthContext";
import { MutationProvider } from "./context/MutationContext";
import { AppWithSpinner } from "./components/AppWithSpinner";
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary";

// Basic error handling - don't suppress all rejections
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't prevent default - let React handle it properly
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MutationProvider>
          <AuthProvider>
            <TooltipProvider>
              <AppWithSpinner />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </MutationProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;