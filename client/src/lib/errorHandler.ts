
export class AppError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.status === 401) {
    return new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }

  if (error?.status === 403) {
    return new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  if (error?.status === 404) {
    return new AppError('Resource not found', 404, 'NOT_FOUND');
  }

  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return new AppError('Network connection error', 0, 'NETWORK_ERROR');
  }

  return new AppError(
    error?.message || 'An unexpected error occurred',
    error?.status || 500,
    'UNKNOWN_ERROR'
  );
};

export const logError = (error: any, context?: string) => {
  // Only log unexpected errors, not auth failures or network errors
  if (
    !error || // Undefined/null errors
    error?.status === 401 || 
    error?.status === 403 ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('fetch') ||
    (typeof error === 'object' && (!error || Object.keys(error).length === 0)) ||
    error === '' ||
    String(error).trim() === '' ||
    JSON.stringify(error) === '{}' ||
    JSON.stringify(error) === 'null' ||
    JSON.stringify(error) === '""'
  ) {
    return;
  }

  // Only log in development to reduce production noise
  if (process.env.NODE_ENV === 'development') {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  }
};
