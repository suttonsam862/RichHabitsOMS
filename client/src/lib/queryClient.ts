import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle authentication errors specifically
    if (res.status === 401) {
      // Clear tokens on auth failures
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Enhance error handling for network issues
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${fullUrl}`);
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
      const res = await fetch(fullUrl, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpires');
        return null;
      }

      await throwIfResNotOk(res);
      return res.json();
    } catch (error: any) {
      // Enhanced error handling for development
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn(`Network error for ${fullUrl}:`, error.message);
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      throw error;
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('401 response, clearing tokens and returning null');
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log('Successfully fetched data:', data);
    return data;
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