
// Simple error handler without initialization complexity
let errorCount = 0;
const MAX_ERRORS_PER_MINUTE = 5;

// Reset error count periodically
setInterval(() => {
  errorCount = 0;
}, 60000);

export function handleGlobalError(error: any, context: string = 'Unknown') {
  if (errorCount >= MAX_ERRORS_PER_MINUTE) {
    return;
  }
  errorCount++;

  // Don't log expected network errors
  if (error?.message?.includes('fetch') || 
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('Failed to fetch')) {
    return;
  }

  console.error(`🚨 Error [${context}]:`, error);
}

// Simple global error listeners
window.addEventListener('error', (event) => {
  handleGlobalError(event.error, 'Window Error');
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalError(event.reason, 'Unhandled Promise');
});

console.log('✅ Error handlers initialized');
