import React from 'react';
import { Loader2 } from 'lucide-react';

export function GlobalSpinner() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="glass-panel p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading ThreadCraft...</p>
      </div>
    </div>
  );
}