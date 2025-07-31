
// This file is intentionally empty to prevent fetch interception issues
// The auth system now works without complex interceptors

export const initializeFetchInterceptor = () => {
  // No-op - interceptor disabled to prevent auth issues
  console.log('✅ Fetch interceptor disabled for stability');
};
