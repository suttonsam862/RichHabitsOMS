
/**
 * Application constants
 * Centralized configuration values used throughout the application
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_TIMEOUT = 30000; // 30 seconds

// Pagination Defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File Upload Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Form Validation Limits
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_TEXT_LENGTH = 1000;
export const MAX_NAME_LENGTH = 50;
export const MAX_EMAIL_LENGTH = 255;

// Order Configuration
export const ORDER_STATUSES = ['draft', 'pending', 'approved', 'in_production', 'completed', 'cancelled'] as const;
export const MAX_ORDER_QUANTITY = 10000;
export const MAX_ORDER_VALUE = 100000;

// Catalog Configuration
export const CATALOG_ITEM_STATUSES = ['active', 'inactive', 'discontinued'] as const;
export const DEFAULT_ETA_DAYS = '7-14';

// User Roles
export const USER_ROLES = ['admin', 'customer', 'manufacturer', 'salesperson', 'designer'] as const;

// Dashboard Refresh Intervals
export const STATS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const ORDERS_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  FILE_TOO_LARGE: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_FILE_TYPE: 'Invalid file type. Please select a supported file.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  UPLOADED: 'File uploaded successfully',
} as const;

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ORDERS: '/orders',
  CUSTOMERS: '/customers',
  CATALOG: '/catalog',
  MESSAGES: '/messages',
  PRODUCTION: '/production',
  PAYMENTS: '/payments',
  SETTINGS: '/settings',
} as const;
