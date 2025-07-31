
// Simplified - error handling moved to errorHandler.ts
let serverHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds

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

// Simple error handler - no fetch override (handled by errorHandler.ts)
export function handleFetchError(error: any, url: string) {
  // Minimal logging for debugging only
  if (!url.includes('/api/auth/me') && !url.includes('/api/health')) {
    console.debug('🚨 FETCH ERROR:', { url, error: error.message });
  }
}
