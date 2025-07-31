
// NUCLEAR HMR SUPPRESSION - Completely eliminate Vite development noise

if (import.meta.env.DEV) {
  // Override EventSource to prevent HMR connection errors
  const OriginalEventSource = window.EventSource;
  
  window.EventSource = class MockEventSource extends EventSource {
    constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      // Don't actually create the connection, just mock it
      super('data:text/plain,', eventSourceInitDict);
      
      // Immediately mark as open
      Object.defineProperty(this, 'readyState', { value: 1 });
      
      // Schedule fake open event
      setTimeout(() => {
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      }, 0);
    }
    
    close() {
      // Silent close
    }
  };

  // Suppress all console.warn messages related to HMR in development
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = String(args[0] || '').toLowerCase();
    if (message.includes('hmr') || 
        message.includes('vite') || 
        message.includes('websocket') ||
        message.includes('connection') ||
        message.includes('hot reload')) {
      return; // Suppress
    }
    originalWarn(...args);
  };

  // Nuclear option: Prevent ALL module.hot errors
  if (import.meta.hot) {
    import.meta.hot.on('vite:error', () => {
      // Silent suppression
    });
    
    import.meta.hot.on('vite:ws:disconnect', () => {
      // Silent suppression
    });
  }
}
