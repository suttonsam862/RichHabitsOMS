/**
 * Global fetch interceptor to eliminate fetch spam across the entire application
 */

import { circuitBreaker } from './fetchCircuitBreaker';

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

class GlobalFetchManager {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestQueue: Map<string, Array<(response: Response) => void>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();
  private readonly minInterval = 1000; // Minimum 1 second between identical requests

  constructor() {
    this.initializeFetchInterceptor();
  }

  private initializeFetchInterceptor(): void {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override global fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      const requestKey = `${method}:${url}`;
      
      // Check if we should allow this request
      if (!this.shouldAllowRequest(requestKey)) {
        console.log(`⏸️ Request throttled: ${requestKey}`);
        
        // Return pending request if exists
        const pending = this.pendingRequests.get(requestKey);
        if (pending) {
          return pending.promise.then(response => response.clone());
        }
        
        // Create a rejected promise for blocked requests
        return Promise.reject(new Error('Request throttled by global fetch manager'));
      }

      // Check circuit breaker
      const endpoint = url.split('?')[0];
      if (!circuitBreaker.canMakeRequest(endpoint)) {
        console.log(`🚫 Request blocked by circuit breaker: ${endpoint}`);
        return Promise.reject(new Error(`Circuit breaker is open for ${endpoint}`));
      }

      // Record request time
      this.lastRequestTime.set(requestKey, Date.now());

      try {
        // Make the actual request
        const promise = originalFetch(input, init);
        
        // Store pending request
        this.pendingRequests.set(requestKey, {
          promise,
          timestamp: Date.now()
        });

        const response = await promise;
        
        // Record success/failure in circuit breaker
        if (response.ok) {
          circuitBreaker.recordSuccess(endpoint);
        } else {
          circuitBreaker.recordFailure(endpoint, { status: response.status });
        }

        // Clean up
        this.pendingRequests.delete(requestKey);
        
        return response;
      } catch (error) {
        // Clean up and record failure
        this.pendingRequests.delete(requestKey);
        circuitBreaker.recordFailure(endpoint, error);
        throw error;
      }
    };

    console.log('🔧 Global fetch interceptor initialized');
  }

  private shouldAllowRequest(requestKey: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(requestKey);
    
    if (lastRequest && (now - lastRequest) < this.minInterval) {
      return false;
    }
    
    return true;
  }

  // Clean up old pending requests
  cleanup(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > timeout) {
        this.pendingRequests.delete(key);
      }
    }
  }

  // Get status for debugging
  getStatus(): any {
    return {
      pendingRequests: this.pendingRequests.size,
      circuitBreakerStatus: 'See circuit breaker logs'
    };
  }

  // Reset all throttling
  reset(): void {
    this.pendingRequests.clear();
    this.lastRequestTime.clear();
    circuitBreaker.reset();
    console.log('🔄 Global fetch manager reset');
  }
}

// Initialize global fetch manager
export const globalFetchManager = new GlobalFetchManager();

// Cleanup interval
setInterval(() => {
  globalFetchManager.cleanup();
}, 60000); // Every minute