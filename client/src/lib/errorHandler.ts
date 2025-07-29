
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
  // Only log unexpected errors, not auth failures
  if (error?.status === 401 || error?.status === 403) {
    return;
  }

  console.error(`Error${context ? ` in ${context}` : ''}:`, error);
};
