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

    // Create headers with auth token if available
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Clear tokens on auth failures
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpires');
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401 errors - clear auth and redirect
        if (error?.response?.status === 401) {
          clearAuthToken();
          window.location.href = '/login';
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) {
          clearAuthToken();
          window.location.href = '/login';
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});