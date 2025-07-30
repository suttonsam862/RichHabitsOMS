import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function for deep equality comparison
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

// Enhanced fetch wrapper with comprehensive error logging
export async function apiRequest(url: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const requestDetails = {
    url,
    method: options.method || 'GET',
    headers: defaultHeaders,
    hasBody: !!options.body,
    timestamp: new Date().toISOString()
  };

  try {
    // Log request details
    console.log('Utils API Request:', requestDetails);

    const response = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    });

    // Handle network-level failures with comprehensive logging
    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (bodyError) {
        errorBody = 'Failed to read response body';
        console.error('Response body read error:', bodyError);
      }

      // Comprehensive error logging
      console.error('Utils API Request Failed:', {
        ...requestDetails,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: errorBody,
        error: `HTTP ${response.status}: ${errorBody}`
      });

      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    // Log successful response
    console.log('Utils API Response Success:', {
      ...requestDetails,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseContentType: response.headers.get('content-type')
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error: any) {
    // Comprehensive error logging
    console.error('Utils API Request Error:', {
      ...requestDetails,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });

    // Handle different types of network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network connection failed:', url);
      throw new Error('Network connection failed. Please check your internet connection.');
    }

    if (error.message.includes('NetworkError')) {
      console.error('Network error occurred:', url);
      throw new Error('Network error occurred. Please try again.');
    }

    // Re-throw the original error for other cases
    throw error;
  }
}

// Utility to check if we're in development mode
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname.includes('replit.dev') ||
         window.location.hostname.includes('localhost');
};

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numAmount);
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

export function generateOrderNumber(): string {
  return `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function getInitials(name: string): string {
  if (!name) return '';

  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-indigo-500 text-white';
    case 'salesperson':
      return 'bg-sky-500 text-white';
    case 'designer':
      return 'bg-pink-500 text-white';
    case 'manufacturer':
      return 'bg-amber-500 text-white';
    case 'customer':
      return 'bg-emerald-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
    case 'pending_design':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
    case 'design_in_progress':
      return 'bg-cyan-100 text-cyan-800';
    case 'submitted':
    case 'design_review':
      return 'bg-purple-100 text-purple-800';
    case 'approved':
    case 'design_approved':
      return 'bg-indigo-100 text-indigo-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-800';
    case 'pending_production':
      return 'bg-amber-100 text-amber-800';
    case 'in_production':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getStatusLabel(status: string): string {
  if (!status || typeof status !== 'string') {
    return 'Unknown';
  }
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function calculateOrderTotal(items: any[]): number {
  return items.reduce((total, item) => {
    const itemTotal = typeof item.totalPrice === 'string' 
      ? parseFloat(item.totalPrice) 
      : item.totalPrice;
    return total + itemTotal;
  }, 0);
}

export function getFileIcon(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return 'file-pdf';
    case 'ai':
    case 'eps':
    case 'svg':
      return 'file-vector';
    case 'psd':
      return 'file-image';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    default:
      return 'file';
  }
}

export function getTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }

  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }

  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }

  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }

  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }

  return Math.floor(seconds) + " seconds ago";
}

/**
 * Gets CSS classes for field styling based on validation state
 */
export function getFieldStyles(fieldName: string, changedFields: string[], hasErrors: boolean = false): string {
  const isChanged = changedFields.includes(fieldName);
  
  if (hasErrors) {
    return "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500";
  }
  
  if (isChanged) {
    return "border-amber-300 bg-amber-50 focus:border-amber-500 focus:ring-amber-500 shadow-sm ring-1 ring-amber-200";
  }
  
  return "border-input";
}