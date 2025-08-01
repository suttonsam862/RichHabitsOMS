
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./context/AuthContext";
import { MutationProvider } from "./context/MutationContext";
import { AppWithSpinner } from "./components/AppWithSpinner";
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary";
import { AppRouter } from "./components/Router";

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <MutationProvider>
          <AuthProvider>
            <TooltipProvider>
              <AppWithSpinner>
                <AppRouter />
                <Toaster />
              </AppWithSpinner>
            </TooltipProvider>
          </AuthProvider>
        </MutationProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
