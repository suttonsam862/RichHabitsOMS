import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px' }}>
        <h1>Debug App - Testing Basic Loading</h1>
        <p>If you see this, the basic React app is working.</p>
      </div>
    </QueryClientProvider>
  );
}

export default App;