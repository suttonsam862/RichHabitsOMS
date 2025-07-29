import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

  // Create headers with auth token if available
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check for authentication token
    const token = localStorage.getItem('authToken');
    console.log('Query function called for:', queryKey[0], 'with token:', token ? 'present' : 'missing');

    // Create headers with auth token if available
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log('Added Authorization header to request');
    } else {
      console.log('No auth token found in localStorage');
    }

    console.log('Making request to:', queryKey[0], 'with headers:', headers);

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    console.log('Response status:', res.status);

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
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry auth failures
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Reduce unnecessary requests
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