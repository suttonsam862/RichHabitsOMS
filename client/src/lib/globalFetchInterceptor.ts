// Global fetch interceptor for error handling and server health
let serverHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Check server health periodically
export async function checkServerHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && serverHealthy) {
    return serverHealthy;
  }

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      timeout: 5000,
    } as any);

    serverHealthy = response.ok;
    lastHealthCheck = now;
    return serverHealthy;
  } catch (error) {
    serverHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

// Simple error handler - no fetch override
export function handleFetchError(error: any, url: string) {
  // Only log real errors, not development noise
  if (!url.includes('0.0.0.0') && !url.includes('_vite_ping')) {
    console.error('🚨 FETCH ERROR:', {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}