let isServerReady = false;
let healthCheckInProgress = false;
let fetchAttemptCounts = new Map<string, { count: number, lastAttempt: number }>();
const MAX_FETCH_ATTEMPTS = 3;
const BACKOFF_TIME = 5000; // 5 seconds

// Check server readiness before allowing fetches
async function checkServerHealth(): Promise<boolean> {
  if (healthCheckInProgress) return isServerReady;

  healthCheckInProgress = true;

  try {
    const response = await fetch('/api/health', { 
      method: 'GET',
      cache: 'no-cache'
    });

    if (response.ok) {
      isServerReady = true;
      console.log('✅ Server is ready - fetch operations enabled');
      return true;
    }
  } catch (error) {
    // Silent fail during server startup
  }

  healthCheckInProgress = false;
  return false;
}

// Enhanced fetch wrapper with retry logic and server readiness
const originalFetch = window.fetch;

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // Allow health checks to pass through
  if (url.includes('/api/health')) {
    return originalFetch(input, init);
  }

  // Block other API calls until server is ready
  if (url.startsWith('/api/') && !isServerReady) {
    const ready = await checkServerHealth();
    if (!ready) {
      // Return a controlled rejection instead of letting it propagate
      return Promise.reject(new Error('Server not ready - request blocked'));
    }
  }

  // Rate limiting per endpoint
  const attemptKey = url;
  const now = Date.now();
  const attempts = fetchAttemptCounts.get(attemptKey) || { count: 0, lastAttempt: 0 };

  // Reset count if enough time has passed
  if (now - attempts.lastAttempt > BACKOFF_TIME) {
    attempts.count = 0;
  }

  // Block if too many attempts
  if (attempts.count >= MAX_FETCH_ATTEMPTS) {
    const timeRemaining = BACKOFF_TIME - (now - attempts.lastAttempt);
    if (timeRemaining > 0) {
      console.warn(`🚫 Rate limited: ${url} (${Math.ceil(timeRemaining/1000)}s remaining)`);
      return Promise.reject(new Error(`Rate limited - try again in ${Math.ceil(timeRemaining/1000)}s`));
    }
  }

  try {
    const response = await originalFetch(input, init);

    // Reset attempts on success
    if (response.ok) {
      fetchAttemptCounts.delete(attemptKey);
    } else {
      // Handle specific error cases
      if (response.status === 401 && url.includes('/api/auth/me')) {
        // Expected 401 for unauthenticated users - don't count as failure
        console.debug('🔒 Expected auth check for unauthenticated user');
        return response;
      }
      
      // Increment attempt count on failure
      attempts.count++;
      attempts.lastAttempt = now;
      fetchAttemptCounts.set(attemptKey, attempts);

      // Log only first failure per endpoint to reduce spam
      if (attempts.count === 1 && !url.includes('auth/me')) {
        console.warn(`⚠️ Fetch failed: ${response.status} ${url}`);
      }
    }

    return response;
  } catch (error) {
    // Handle network errors gracefully for auth endpoints
    if (url.includes('/api/auth/me')) {
      console.debug('🔒 Auth endpoint network error (expected during startup)');
      return new Response(JSON.stringify({ success: false, message: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Increment attempt count on error
    attempts.count++;
    attempts.lastAttempt = now;
    fetchAttemptCounts.set(attemptKey, attempts);

    // Log only first error per endpoint to reduce spam, suppress auth/me errors
    if (attempts.count === 1 && !url.includes('auth/me') && !url.includes('0.0.0.0')) {
      console.warn(`❌ Fetch error: ${url}`, error instanceof Error ? error.message : error);
    }

    throw error;
  }
};

// Initial server check
checkServerHealth();

export { isServerReady, checkServerHealth };