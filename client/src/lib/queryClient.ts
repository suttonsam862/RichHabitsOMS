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
      // Clear tokens on auth failures
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      console.warn('Authentication token cleared due to 401 response');
    }

    throw new Error(`${res.status}: ${responseBody}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check for authentication token
  const token = localStorage.getItem('authToken');

  // Create full URL with base URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Create headers with auth token if available
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    // Log request details for debugging
    console.log('API Request:', {
      method,
      url: fullUrl,
      hasAuth: !!token,
      hasBody: !!data,
      timestamp: new Date().toISOString()
    });

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

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
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check for authentication token
    const token = localStorage.getItem('authToken');

    // Create full URL with base URL
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Create headers with auth token if available
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      // Log query request details
      console.log('Query Request:', {
        url: fullUrl,
        queryKey: queryKey[0],
        hasAuth: !!token,
        timestamp: new Date().toISOString()
      });

      const res = await fetch(fullUrl, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn('Query 401 response - clearing auth tokens:', {
          url: fullUrl,
          queryKey: queryKey[0]
        });
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
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

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - reduced for better sync
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry auth failures or network errors
        if (
          error?.status === 401 || 
          error?.status === 403 ||
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError')
        ) {
          return false;
        }
        return failureCount < 2; // Reduced retry attempts
      },
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: true, // Enable refetch on mount for better sync
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
      onError: (error: any) => {
        // Only log unexpected errors
        if (error?.status !== 401 && error?.status !== 403) {
          console.error('Mutation error:', error);
        }
      },
    },
  },
});