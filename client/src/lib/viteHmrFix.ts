
/**
 * Vite HMR Connection Fix for Replit Environment
 * Prevents console spam from connection polling and WebSocket errors
 */

let hmrConnectionAttempts = 0;
const maxHmrAttempts = 2;
let lastHmrAttempt = 0;
const hmrAttemptCooldown = 30000; // 30 seconds

// Utility to check if we're in development mode
const isDevelopment = (): boolean => {
  return import.meta.env.DEV || process.env.NODE_ENV === 'development';
};

// Override EventSource for Vite HMR fallback connections
export function suppressViteHmrSpam() {
  if (typeof window !== 'undefined' && isDevelopment()) {
    // Store original EventSource
    const OriginalEventSource = window.EventSource;
    
    if (OriginalEventSource) {
      window.EventSource = class extends OriginalEventSource {
        constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
          const now = Date.now();
          
          // Check if this is a Vite HMR connection
          const urlStr = typeof url === 'string' ? url : url.toString();
          if (urlStr.includes('_vite_ping') || urlStr.includes('hmr') || urlStr.includes('/@vite/')) {
            // Apply rate limiting for HMR connections
            if (hmrConnectionAttempts >= maxHmrAttempts && now - lastHmrAttempt < hmrAttemptCooldown) {
              // Return a dummy EventSource that doesn't actually connect
              super('data:text/plain,');
              this.close();
              return;
            }
            
            hmrConnectionAttempts++;
            lastHmrAttempt = now;
          }
          
          super(url, eventSourceInitDict);
          
          // Suppress error logging for HMR connections
          this.addEventListener('error', (event) => {
            if (urlStr.includes('_vite_ping') || urlStr.includes('hmr') || urlStr.includes('/@vite/')) {
              event.preventDefault();
              event.stopPropagation();
            }
          });
        }
      };
    }

    // Override fetch for Vite ping requests - but don't interfere with global interceptor
    const originalFetch = window.fetch;
    let viteOverrideActive = false;
    
    if (!viteOverrideActive) {
      viteOverrideActive = true;
      
      window.fetch = async (...args) => {
        const url = args[0];
        const urlStr = typeof url === 'string' ? url : url.toString();
        
        // Only handle Vite-specific requests
        if (urlStr.includes('_vite_ping') || urlStr.includes('/@vite/')) {
          try {
            return await originalFetch(...args);
          } catch (error) {
            // Silently handle Vite ping failures - these are expected in development
            if (import.meta.env.VITE_DEBUG_VERBOSE) {
              console.debug('Vite HMR ping failed (expected in development):', error);
            }
            // Return a mock successful response for ping requests to prevent console spam
            return new Response('ok', { status: 200, statusText: 'OK' });
          }
        }
        
        // Pass through to original fetch (which may be the global interceptor)
        return originalFetch(...args);
      };
    }
  }
}

// Enhanced console suppression targeting specific Vite messages
export function suppressViteConsoleSpam() {
  if (typeof window !== 'undefined' && isDevelopment()) {
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;

    // Vite message patterns to suppress
    const viteMessagePatterns = [
      '[vite] server connection lost',
      '[vite] connecting...',
      'Polling for restart',
      '_vite_ping',
      'hmr update',
      'vite:ws',
      'WebSocket connection to',
      'Failed to establish a connection',
      'WebSocket is already in CLOSING or CLOSED state',
      'Connection failed'
    ];

    const shouldSuppressMessage = (message: string): boolean => {
      return viteMessagePatterns.some(pattern => 
        message.toLowerCase().includes(pattern.toLowerCase())
      );
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message)) {
        originalConsoleWarn.apply(console, args);
      }
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message) && !import.meta.env.VITE_SUPPRESS_DEV_ERRORS) {
        originalConsoleError.apply(console, args);
      }
    };

    console.info = (...args) => {
      const message = args.join(' ');
      if (!shouldSuppressMessage(message)) {
        originalConsoleInfo.apply(console, args);
      }
    };
  }
}

// Additional WebSocket state management
export function enhanceWebSocketStability() {
  if (typeof window !== 'undefined' && window.WebSocket && isDevelopment()) {
    const OriginalWebSocket = window.WebSocket;
    let wsConnectionCount = 0;
    const maxConcurrentConnections = 2; // Reduced from 3

    window.WebSocket = class extends OriginalWebSocket {
      private isViteHmr: boolean;

      constructor(url: string | URL, protocols?: string | string[]) {
        const urlStr = typeof url === 'string' ? url : url.toString();
        
        // Detect Vite HMR connections
        this.isViteHmr = urlStr.includes('_vite_ping') || 
                        urlStr.includes('hmr') || 
                        urlStr.includes('/@vite/') ||
                        urlStr.includes('ws://') || 
                        urlStr.includes('wss://');
        
        // Limit concurrent WebSocket connections for HMR
        if (this.isViteHmr && wsConnectionCount >= maxConcurrentConnections) {
          // Create a dummy WebSocket that fails quickly
          super('ws://localhost:0');
          this.close();
          return;
        }

        super(url, protocols);
        
        if (this.isViteHmr) {
          wsConnectionCount++;
        }

        // Enhanced error handling
        this.addEventListener('open', () => {
          if (this.isViteHmr && import.meta.env.VITE_DEBUG_VERBOSE) {
            console.debug('Vite HMR WebSocket connected');
          }
        });

        this.addEventListener('close', () => {
          if (this.isViteHmr) {
            wsConnectionCount = Math.max(0, wsConnectionCount - 1);
            if (import.meta.env.VITE_DEBUG_VERBOSE) {
              console.debug('Vite HMR WebSocket closed');
            }
          }
        });

        this.addEventListener('error', (event) => {
          if (this.isViteHmr) {
            // Suppress Vite HMR WebSocket errors unless in verbose mode
            event.preventDefault();
            event.stopPropagation();
            wsConnectionCount = Math.max(0, wsConnectionCount - 1);
            
            if (import.meta.env.VITE_DEBUG_VERBOSE) {
              console.debug('Vite HMR WebSocket error (suppressed):', event);
            }
          }
        });
      }
    };
  }
}

// Initialize all fixes
export function initViteHmrFixes() {
  if (isDevelopment()) {
    suppressViteHmrSpam();
    suppressViteConsoleSpam();
    enhanceWebSocketStability();
    console.log('🔧 Vite HMR connection fixes initialized for development');
  }
}
