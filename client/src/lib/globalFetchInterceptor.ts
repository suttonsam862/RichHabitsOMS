
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
  private lastRequestTime: Map<string, number> = new Map();
  private failureCount: Map<string, number> = new Map();
  private readonly minInterval = 500; // Reduced to 500ms for better responsiveness
  private readonly maxRetries = 3;

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
      
      // Skip throttling for critical requests
      if (this.isCriticalRequest(url)) {
        return this.makeRequest(originalFetch, input, init, url);
      }

      // Check if we should allow this request
      if (!this.shouldAllowRequest(requestKey)) {
        // Return pending request if exists
        const pending = this.pendingRequests.get(requestKey);
        if (pending) {
          try {
            return await pending.promise.then(response => response.clone());
          } catch (error) {
            // If pending request failed, allow retry
            this.pendingRequests.delete(requestKey);
          }
        }
        
        // Create a throttled rejection that doesn't spam console
        const error = new Error('Request throttled');
        error.name = 'ThrottledRequest';
        throw error;
      }

      return this.makeRequest(originalFetch, input, init, url, requestKey);
    };

    console.log('🔧 Global fetch interceptor initialized');
  }

  private isCriticalRequest(url: string): boolean {
    return url.includes('/api/auth/') || 
           url.includes('/api/health') ||
           url.includes('/_vite_ping') ||
           url.includes('/api/dashboard/stats');
  }

  private async makeRequest(
    originalFetch: typeof fetch, 
    input: RequestInfo | URL, 
    init: RequestInit | undefined,
    url: string,
    requestKey?: string
  ): Promise<Response> {
    const endpoint = url.split('?')[0];
    
    // Check circuit breaker for non-critical requests
    if (requestKey && !circuitBreaker.canMakeRequest(endpoint)) {
      const error = new Error(`Circuit breaker is open for ${endpoint}`);
      error.name = 'CircuitBreakerOpen';
      throw error;
    }

    // Record request time
    if (requestKey) {
      this.lastRequestTime.set(requestKey, Date.now());
      
      // Store pending request
      const promise = originalFetch(input, init);
      this.pendingRequests.set(requestKey, {
        promise,
        timestamp: Date.now()
      });
    }

    try {
      const response = await originalFetch(input, init);
      
      // Record success/failure in circuit breaker
      if (response.ok) {
        circuitBreaker.recordSuccess(endpoint);
        if (requestKey) {
          this.failureCount.delete(requestKey);
        }
      } else {
        circuitBreaker.recordFailure(endpoint, { status: response.status });
        this.recordFailure(requestKey);
      }

      // Clean up
      if (requestKey) {
        this.pendingRequests.delete(requestKey);
      }
      
      return response;
    } catch (error) {
      // Clean up and record failure
      if (requestKey) {
        this.pendingRequests.delete(requestKey);
      }
      
      // Only log errors that aren't development noise
      if (!this.isDevelopmentNoise(url, error)) {
        circuitBreaker.recordFailure(endpoint, error);
        this.recordFailure(requestKey);
      }
      
      throw error;
    }
  }

  private isDevelopmentNoise(url: string, error: any): boolean {
    // These are expected to fail in development
    return url.includes('_vite_ping') || 
           url.includes('/@vite/') ||
           url.includes('/__vite_ping') ||
           (error?.name === 'TypeError' && url.includes('localhost'));
  }

  private shouldAllowRequest(requestKey: string): boolean {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(requestKey);
    const failures = this.failureCount.get(requestKey) || 0;
    
    // Allow if enough time has passed
    if (!lastRequest || (now - lastRequest) >= this.minInterval) {
      return true;
    }
    
    // Block if too many recent failures
    if (failures >= this.maxRetries) {
      const timeSinceLastFailure = now - lastRequest;
      // Exponential backoff: wait longer after more failures
      const backoffTime = Math.min(this.minInterval * Math.pow(2, failures - this.maxRetries), 30000);
      return timeSinceLastFailure >= backoffTime;
    }
    
    return false;
  }

  private recordFailure(requestKey?: string): void {
    if (requestKey) {
      const current = this.failureCount.get(requestKey) || 0;
      this.failureCount.set(requestKey, current + 1);
    }
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

    // Clean up old failure counts
    for (const [key, time] of this.lastRequestTime.entries()) {
      if (now - time > 300000) { // 5 minutes
        this.lastRequestTime.delete(key);
        this.failureCount.delete(key);
      }
    }
  }

  // Get status for debugging
  getStatus(): any {
    return {
      pendingRequests: this.pendingRequests.size,
      failureCount: Object.fromEntries(this.failureCount),
      lastRequestTimes: this.lastRequestTime.size
    };
  }

  // Reset all throttling
  reset(): void {
    this.pendingRequests.clear();
    this.lastRequestTime.clear();
    this.failureCount.clear();
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
