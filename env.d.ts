/**
 * ENVIRONMENT VARIABLES TYPE DEFINITIONS
 * Comprehensive type definitions for all environment variables used in ThreadCraft
 * Provides IntelliSense and type safety for environment variable access
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // =====================================
      // CORE SYSTEM VARIABLES
      // =====================================
      
      /** Node.js environment (development, production, test) */
      NODE_ENV: 'development' | 'production' | 'test';
      
      /** Application port number */
      PORT?: string;
      
      // =====================================
      // DATABASE CONFIGURATION (REQUIRED)
      // =====================================
      
      /** Supabase project URL - Required for database connection */
      SUPABASE_URL: string;
      
      /** Supabase anonymous key - Required for client-side database access */
      SUPABASE_ANON_KEY: string;
      
      /** PostgreSQL connection string - Required for direct database operations */
      DATABASE_URL: string;
      
      // =====================================
      // AUTHENTICATION & SECURITY
      // =====================================
      
      /** Supabase service role key - Optional but recommended for admin operations */
      SUPABASE_SERVICE_KEY?: string;
      
      /** Session secret for Express session management - Required for authentication */
      SESSION_SECRET?: string;
      
      // =====================================
      // PAYMENT PROCESSING (STRIPE)
      // =====================================
      
      /** Stripe secret key for server-side payment processing - Required for payments */
      STRIPE_SECRET_KEY?: string;
      
      /** Stripe webhook endpoint secret for webhook validation - Required for payment webhooks */
      STRIPE_WEBHOOK_SECRET?: string;
      
      // =====================================
      // EMAIL SERVICES
      // =====================================
      
      /** SendGrid API key for email notifications - Optional */
      SENDGRID_API_KEY?: string;
      
      /** From email address for system notifications - Optional */
      SENDGRID_FROM_EMAIL?: string;
      
      /** Generic email service provider - Optional */
      EMAIL_SERVICE?: string;
      
      /** Email username for SMTP authentication - Optional */
      EMAIL_USER?: string;
      
      /** Email password for SMTP authentication - Optional */
      EMAIL_PASSWORD?: string;
      
      // =====================================
      // QUICKBOOKS INTEGRATION (OPTIONAL)
      // =====================================
      
      /** QuickBooks client ID for OAuth - Optional */
      QBO_CLIENT_ID?: string;
      
      /** QuickBooks client secret for OAuth - Optional */
      QBO_CLIENT_SECRET?: string;
      
      /** QuickBooks realm (company) ID - Optional */
      QBO_REALM_ID?: string;
      
      /** QuickBooks refresh token for API access - Optional */
      QBO_REFRESH_TOKEN?: string;
      
      /** QuickBooks access token for API access - Optional */
      QBO_ACCESS_TOKEN?: string;
      
      /** QuickBooks sandbox mode flag - Optional */
      QBO_SANDBOX?: string;
      
      // =====================================
      // REPLIT ENVIRONMENT
      // =====================================
      
      /** Replit deployment domain - Automatically set by Replit */
      REPLIT_DEV_DOMAIN?: string;
      
      /** Replit database URL - Automatically set by Replit */
      REPLIT_DB_URL?: string;
      
      /** Replit slug identifier - Automatically set by Replit */
      REPL_SLUG?: string;
      
      /** Replit owner username - Automatically set by Replit */
      REPL_OWNER?: string;
      
      /** Replit unique identifier - Automatically set by Replit */
      REPL_ID?: string;
      
      // =====================================
      // FILE STORAGE & MEDIA
      // =====================================
      
      /** AWS S3 access key for file storage - Optional */
      AWS_ACCESS_KEY_ID?: string;
      
      /** AWS S3 secret key for file storage - Optional */
      AWS_SECRET_ACCESS_KEY?: string;
      
      /** AWS S3 bucket name for file storage - Optional */
      AWS_S3_BUCKET?: string;
      
      /** AWS S3 region for file storage - Optional */
      AWS_S3_REGION?: string;
      
      /** Cloudinary cloud name for image processing - Optional */
      CLOUDINARY_CLOUD_NAME?: string;
      
      /** Cloudinary API key for image processing - Optional */
      CLOUDINARY_API_KEY?: string;
      
      /** Cloudinary API secret for image processing - Optional */
      CLOUDINARY_API_SECRET?: string;
      
      // =====================================
      // MONITORING & ANALYTICS
      // =====================================
      
      /** Sentry DSN for error tracking - Optional */
      SENTRY_DSN?: string;
      
      /** Google Analytics tracking ID - Optional */
      GA_TRACKING_ID?: string;
      
      /** LogRocket app ID for session recording - Optional */
      LOGROCKET_APP_ID?: string;
      
      // =====================================
      // RATE LIMITING & SECURITY
      // =====================================
      
      /** Redis URL for rate limiting and caching - Optional */
      REDIS_URL?: string;
      
      /** Maximum request rate per minute - Optional */
      RATE_LIMIT_MAX?: string;
      
      /** Rate limit window in minutes - Optional */
      RATE_LIMIT_WINDOW?: string;
      
      /** CORS allowed origins (comma-separated) - Optional */
      CORS_ORIGINS?: string;
      
      // =====================================
      // DEVELOPMENT & DEBUGGING
      // =====================================
      
      /** Enable debug logging - Optional */
      DEBUG?: string;
      
      /** Log level (error, warn, info, debug) - Optional */
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
      
      /** Enable SQL query logging - Optional */
      LOG_SQL?: string;
      
      /** Disable authentication for development - Optional */
      DISABLE_AUTH?: string;
      
      // =====================================
      // FEATURE FLAGS
      // =====================================
      
      /** Enable payment processing - Optional */
      ENABLE_PAYMENTS?: string;
      
      /** Enable email notifications - Optional */
      ENABLE_EMAIL?: string;
      
      /** Enable QuickBooks integration - Optional */
      ENABLE_QUICKBOOKS?: string;
      
      /** Enable file uploads - Optional */
      ENABLE_FILE_UPLOADS?: string;
      
      /** Enable real-time features - Optional */
      ENABLE_REALTIME?: string;
    }
  }
}

// =====================================
// VITE ENVIRONMENT VARIABLES
// =====================================

declare interface ImportMetaEnv {
  // =====================================
  // VITE SYSTEM VARIABLES
  // =====================================
  
  /** Vite mode (development, production) */
  readonly MODE: string;
  
  /** Base URL for the application */
  readonly BASE_URL: string;
  
  /** Production mode flag */
  readonly PROD: boolean;
  
  /** Development mode flag */
  readonly DEV: boolean;
  
  /** Server-side rendering flag */
  readonly SSR: boolean;
  
  // =====================================
  // FRONTEND CONFIGURATION
  // =====================================
  
  /** Stripe publishable key for client-side payment processing */
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  
  /** API base URL for frontend requests */
  readonly VITE_API_BASE_URL?: string;
  
  /** Application title */
  readonly VITE_APP_TITLE?: string;
  
  /** Application version */
  readonly VITE_APP_VERSION?: string;
  
  /** Application description */
  readonly VITE_APP_DESCRIPTION?: string;
  
  // =====================================
  // FRONTEND FEATURE FLAGS
  // =====================================
  
  /** Enable debug mode in frontend */
  readonly VITE_DEBUG?: string;
  
  /** Enable development tools */
  readonly VITE_DEV_TOOLS?: string;
  
  /** Enable analytics tracking */
  readonly VITE_ENABLE_ANALYTICS?: string;
  
  /** Enable error reporting */
  readonly VITE_ENABLE_ERROR_REPORTING?: string;
  
  // =====================================
  // FRONTEND THIRD-PARTY SERVICES
  // =====================================
  
  /** Google Analytics measurement ID */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  
  /** Sentry DSN for frontend error tracking */
  readonly VITE_SENTRY_DSN?: string;
  
  /** LogRocket app ID for frontend session recording */
  readonly VITE_LOGROCKET_APP_ID?: string;
  
  /** Intercom app ID for customer support */
  readonly VITE_INTERCOM_APP_ID?: string;
  
  /** Hotjar site ID for user behavior analytics */
  readonly VITE_HOTJAR_SITE_ID?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// =====================================
// UTILITY TYPES
// =====================================

/** Required environment variables for application startup */
export type RequiredEnvVars = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
};

/** Optional environment variables with defaults */
export type OptionalEnvVars = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  SESSION_SECRET: string;
  SUPABASE_SERVICE_KEY: string;
  SENDGRID_API_KEY: string;
};

/** Environment validation result */
export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/** Environment configuration for different deployment stages */
export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  database: {
    url: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey?: string;
  };
  auth: {
    sessionSecret?: string;
  };
  payments: {
    stripeSecretKey?: string;
    stripePublicKey?: string;
    stripeWebhookSecret?: string;
  };
  email: {
    sendgridApiKey?: string;
    fromEmail?: string;
  };
  features: {
    enablePayments: boolean;
    enableEmail: boolean;
    enableQuickbooks: boolean;
    enableFileUploads: boolean;
    enableRealtime: boolean;
  };
}

// =====================================
// VALIDATION HELPERS
// =====================================

/** Validate required environment variables */
export declare function validateRequiredEnvVars(): EnvValidationResult;

/** Get environment configuration object */
export declare function getEnvironmentConfig(): EnvironmentConfig;

/** Check if running in development mode */
export declare function isDevelopment(): boolean;

/** Check if running in production mode */
export declare function isProduction(): boolean;

/** Check if running in test mode */
export declare function isTest(): boolean;

/** Check if feature is enabled */
export declare function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean;

// Export empty object to make this a module
export {};