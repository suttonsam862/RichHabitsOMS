import { QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Enhanced error logging with response status and body
    let responseBody = '';
    try {
      responseBody = await res.text();
    } catch (bodyError) {
      responseBody = res.statusText || 'Unknown error';
      console.error('Failed to read response body:', bodyError);
    }

    // Comprehensive error logging
    console.error('API Request Failed:', {
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: responseBody,
      timestamp: new Date().toISOString()
    });

    // Handle authentication errors specifically
    if (res.status === 401) {
      console.warn('Authentication failed - session may be expired');
    }

    throw new Error(`${res.status}: ${responseBody}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Create full URL with base URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Use session-based authentication - no need for token headers
  // Don't set Content-Type for FormData - browser sets it automatically with boundary
  const headers: HeadersInit = (data && !(data instanceof FormData)) ? { "Content-Type": "application/json" } : {};

  try {
    // Log request details for debugging
    console.log('API Request:', {
      method,
      url: fullUrl,
      usesCookies: true,
      hasBody: !!data,
      timestamp: new Date().toISOString()
    });

    // Add timeout and abort controller for better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    await throwIfResNotOk(res);

    // Log successful response
    console.log('API Response Success:', {
      method,
      url: fullUrl,
      status: res.status,
      statusText: res.statusText,
      timestamp: new Date().toISOString()
    });

    return res;
  } catch (error) {
    // Enhanced error logging with full context
    console.error('API Request Error:', {
      method,
      url: fullUrl,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Enhance error handling for network issues
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: Unable to connect to ${fullUrl}`);
      console.error('Network connectivity issue:', networkError);
      throw networkError;
    }

    // Handle AbortError gracefully
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout: ${fullUrl} took longer than 10 seconds`);
      console.error('Request timeout:', timeoutError);
      throw timeoutError;
    }

    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Create full URL with base URL
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Use session-based authentication (credentials: include) instead of token headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    try {
      // Log query request details
      console.log('Query Request:', {
        url: fullUrl,
        queryKey: queryKey[0],
        usesCookies: true,
        timestamp: new Date().toISOString()
      });

      // Add timeout for query requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for queries

      const res = await fetch(fullUrl, {
        credentials: "include",
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn('Query 401 response - session expired:', {
          url: fullUrl,
          queryKey: queryKey[0]
        });
        // No need to clear localStorage tokens since we use session cookies
        return null;
      }

      await throwIfResNotOk(res);

      // Log successful query response
      console.log('Query Response Success:', {
        url: fullUrl,
        queryKey: queryKey[0],
        status: res.status,
        timestamp: new Date().toISOString()
      });

      return res.json();
    } catch (error: any) {
      // Enhanced error logging for queries
      console.error('Query Request Error:', {
        url: fullUrl,
        queryKey: queryKey[0],
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      // Enhanced error handling for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`Query network error for ${fullUrl}:`, error.message);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      throw error;
    }
  };

// Centralized token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('token'); // Legacy cleanup
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
  localStorage.removeItem('token'); // Remove legacy token
};

const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Get auth token from various sources with priority
  const token = localStorage.getItem('authToken') ||
                localStorage.getItem('token') ||
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token');

  const headers = new Headers(options.headers);

  // ALWAYS include authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Always include credentials for session auth
  const requestOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers,
  };

  // Log request for debugging
  console.log('API Request:', {
    method: options.method || 'GET',
    url,
    hasAuthHeader: !!token,
    usesCookies: true,
    hasBody: !!options.body,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(url, requestOptions);

    if (response.ok) {
      console.log('API Response Success:', {
        method: options.method || 'GET',
        url,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('API Request Failed:', {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.clone().text(),
        timestamp: new Date().toISOString()
      });
    }

    return response;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Single retry for network errors
      retryDelay: 300, // Fast retry for startup
      staleTime: 2 * 60 * 1000, // 2 minutes - balance between performance and freshness
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Speed up component mounting
      throwOnError: false, // Prevent startup crashes
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});