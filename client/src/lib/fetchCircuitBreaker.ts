/**
 * Circuit Breaker to prevent fetch spam and handle failed endpoints gracefully
 */

interface CircuitBreakerState {
  endpoint: string;
  failureCount: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextRetry: number;
}

class FetchCircuitBreaker {
  private circuits: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 3;
  private readonly timeout = 60000; // 1 minute
  private readonly retryDelay = 30000; // 30 seconds

  constructor() {
    // Clear old circuits periodically
    setInterval(() => {
      this.cleanup();
    }, 300000); // 5 minutes
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [endpoint, state] of this.circuits.entries()) {
      if (now - state.lastFailure > this.timeout * 2) {
        this.circuits.delete(endpoint);
      }
    }
  }

  private getState(endpoint: string): CircuitBreakerState {
    if (!this.circuits.has(endpoint)) {
      this.circuits.set(endpoint, {
        endpoint,
        failureCount: 0,
        lastFailure: 0,
        state: 'CLOSED',
        nextRetry: 0
      });
    }
    return this.circuits.get(endpoint)!;
  }

  canMakeRequest(endpoint: string): boolean {
    const state = this.getState(endpoint);
    const now = Date.now();

    switch (state.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (now >= state.nextRetry) {
          state.state = 'HALF_OPEN';
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return true;
    }
  }

  recordSuccess(endpoint: string): void {
    const state = this.getState(endpoint);
    state.failureCount = 0;
    state.state = 'CLOSED';
    state.lastFailure = 0;
  }

  recordFailure(endpoint: string, error?: any): void {
    const state = this.getState(endpoint);
    const now = Date.now();
    
    state.failureCount++;
    state.lastFailure = now;

    // Don't count auth errors as circuit breaker failures
    if (error?.status === 401 || error?.status === 403) {
      return;
    }

    if (state.failureCount >= this.failureThreshold) {
      state.state = 'OPEN';
      state.nextRetry = now + this.retryDelay;
      console.warn(`🚫 Circuit breaker OPEN for ${endpoint} (${state.failureCount} failures)`);
    }
  }

  getStatus(endpoint: string): string {
    const state = this.getState(endpoint);
    const now = Date.now();
    
    if (state.state === 'OPEN' && now < state.nextRetry) {
      const remainingTime = Math.ceil((state.nextRetry - now) / 1000);
      return `BLOCKED (retry in ${remainingTime}s)`;
    }
    
    return `${state.state} (failures: ${state.failureCount})`;
  }

  reset(endpoint?: string): void {
    if (endpoint) {
      this.circuits.delete(endpoint);
    } else {
      this.circuits.clear();
    }
  }
}

// Global circuit breaker instance
export const circuitBreaker = new FetchCircuitBreaker();

// Enhanced fetch wrapper with circuit breaker
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const endpoint = url.split('?')[0]; // Remove query params for circuit breaker key
  
  if (!circuitBreaker.canMakeRequest(endpoint)) {
    const error = new Error(`Circuit breaker is OPEN for ${endpoint}`);
    (error as any).circuitBreakerBlocked = true;
    throw error;
  }

  try {
    const response = await fetch(url, options);
    
    if (response.ok) {
      circuitBreaker.recordSuccess(endpoint);
    } else {
      circuitBreaker.recordFailure(endpoint, { status: response.status });
    }
    
    return response;
  } catch (error) {
    circuitBreaker.recordFailure(endpoint, error);
    throw error;
  }
}