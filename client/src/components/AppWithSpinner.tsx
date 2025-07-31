import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { checkServerHealth } from '@/lib/globalFetchInterceptor';

interface AppWithSpinnerProps {
  children: React.ReactNode;
}

export function AppWithSpinner({ children }: AppWithSpinnerProps) {
  const [serverReady, setServerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simple initialization without server health check
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Loader2 className="animate-spin w-12 h-12 text-[#00d1ff]" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00d1ff]/20 to-[#00ff9f]/20 blur-md"></div>
          </div>
          <div className="text-white/70 text-sm font-medium">
            Waiting for server...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="text-red-400 text-lg font-semibold">
            Connection Error
          </div>
          <div className="text-white/70 text-sm">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00d1ff] text-black font-semibold rounded hover:bg-[#00d1ff]/80 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}