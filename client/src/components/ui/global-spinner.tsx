import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalSpinnerProps {
  message?: string;
  show: boolean;
}

export function GlobalSpinner({ message = "Processing...", show }: GlobalSpinnerProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center space-y-4 max-w-sm mx-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          <p className="text-sm text-gray-600">
            Please wait while we process your request...
          </p>
        </div>
      </div>
    </div>
  );
}