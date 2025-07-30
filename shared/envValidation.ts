/**
 * ENVIRONMENT VALIDATION UTILITIES
 * Utilities for validating and managing environment variables with type safety
 */

import type { RequiredEnvVars, OptionalEnvVars, EnvValidationResult, EnvironmentConfig } from '../env';

// =====================================
// ENVIRONMENT VALIDATION
// =====================================

/**
 * List of required environment variables that must be present for the application to start
 */
export const REQUIRED_ENV_VARS: (keyof RequiredEnvVars)[] = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'DATABASE_URL'
];

/**
 * List of optional environment variables that have sensible defaults
 */
export const OPTIONAL_ENV_VARS: string[] = [
  'SUPABASE_SERVICE_KEY',
  'SESSION_SECRET',
  'SENDGRID_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'QBO_CLIENT_ID',
  'QBO_CLIENT_SECRET',
  'EMAIL_SERVICE',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SENTRY_DSN',
  'REDIS_URL'
];

/**
 * Validate that all required environment variables are present
 */
export function validateRequiredEnvVars(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check important optional variables
  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET: Missing - Using auto-generated session secret (not recommended for production)');
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    warnings.push('SUPABASE_SERVICE_KEY: Missing - Some admin operations may be disabled');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Get comprehensive environment configuration with proper typing
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  
  return {
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    
    database: {
      url: process.env.DATABASE_URL!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    },
    
    auth: {
      sessionSecret: process.env.SESSION_SECRET,
    },
    
    payments: {
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      stripePublicKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    
    email: {
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
    },
    
    features: {
      enablePayments: isFeatureEnabled('ENABLE_PAYMENTS'),
      enableEmail: isFeatureEnabled('ENABLE_EMAIL'),
      enableQuickbooks: isFeatureEnabled('ENABLE_QUICKBOOKS'),
      enableFileUploads: isFeatureEnabled('ENABLE_FILE_UPLOADS'),
      enableRealtime: isFeatureEnabled('ENABLE_REALTIME'),
    }
  };
}

// =====================================
// ENVIRONMENT HELPERS
// =====================================

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const value = process.env[feature];
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get environment variable with default value and type safety
 */
export function getEnvVar<T = string>(
  key: string, 
  defaultValue?: T, 
  transform?: (value: string) => T
): T | undefined {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  if (transform) {
    try {
      return transform(value);
    } catch (error) {
      console.warn(`Failed to transform environment variable ${key}:`, error);
      return defaultValue;
    }
  }
  
  return value as unknown as T;
}

/**
 * Get numeric environment variable with validation
 */
export function getEnvNumber(key: string, defaultValue?: number): number | undefined {
  return getEnvVar(key, defaultValue, (value) => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`Invalid number: ${value}`);
    }
    return num;
  });
}

/**
 * Get boolean environment variable
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean | undefined {
  return getEnvVar(key, defaultValue, (value) => {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  });
}

/**
 * Get array environment variable (comma-separated)
 */
export function getEnvArray(key: string, defaultValue?: string[]): string[] | undefined {
  return getEnvVar(key, defaultValue, (value) => {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  });
}

// =====================================
// VALIDATION MESSAGES
// =====================================

/**
 * Generate formatted validation report
 */
export function generateValidationReport(): string {
  const result = validateRequiredEnvVars();
  const config = getEnvironmentConfig();
  
  let report = `🔍 ENVIRONMENT VALIDATION REPORT\n`;
  report += `=====================================\n\n`;
  
  report += `Environment: ${process.env.NODE_ENV || 'development'}\n`;
  report += `Validation Status: ${result.valid ? '✅ PASSED' : '❌ FAILED'}\n\n`;
  
  if (result.missing.length > 0) {
    report += `💀 MISSING REQUIRED VARIABLES:\n`;
    result.missing.forEach(varName => {
      report += `   - ${varName}\n`;
    });
    report += `\n`;
  }
  
  if (result.warnings.length > 0) {
    report += `⚠️ WARNINGS:\n`;
    result.warnings.forEach(warning => {
      report += `   - ${warning}\n`;
    });
    report += `\n`;
  }
  
  report += `🔧 FEATURE STATUS:\n`;
  report += `   - Payments: ${config.features.enablePayments ? '✅' : '❌'}\n`;
  report += `   - Email: ${config.features.enableEmail ? '✅' : '❌'}\n`;
  report += `   - QuickBooks: ${config.features.enableQuickbooks ? '✅' : '❌'}\n`;
  report += `   - File Uploads: ${config.features.enableFileUploads ? '✅' : '❌'}\n`;
  report += `   - Real-time: ${config.features.enableRealtime ? '✅' : '❌'}\n\n`;
  
  report += `📊 CONFIGURATION:\n`;
  report += `   - Database: ${config.database.url ? '✅ Connected' : '❌ Not configured'}\n`;
  report += `   - Supabase: ${config.database.supabaseUrl ? '✅ Connected' : '❌ Not configured'}\n`;
  report += `   - Auth: ${config.auth.sessionSecret ? '✅ Configured' : '⚠️ Using defaults'}\n`;
  report += `   - Stripe: ${config.payments.stripeSecretKey ? '✅ Configured' : '❌ Not configured'}\n`;
  report += `   - SendGrid: ${config.email.sendgridApiKey ? '✅ Configured' : '❌ Not configured'}\n`;
  
  return report;
}

/**
 * Log environment validation on startup
 */
export function logEnvironmentValidation(): void {
  const report = generateValidationReport();
  console.log(report);
  
  const result = validateRequiredEnvVars();
  if (!result.valid) {
    console.error('\n💀 CRITICAL: Application cannot start with missing required environment variables.');
    console.error('Please check your .env file or environment configuration.');
    
    if (isProduction()) {
      process.exit(1);
    }
  }
}

// =====================================
// STARTUP VALIDATION
// =====================================

/**
 * Comprehensive startup validation
 */
export function validateEnvironmentOnStartup(): boolean {
  console.log('\n🔍 VALIDATING ENVIRONMENT CONFIGURATION...');
  
  const result = validateRequiredEnvVars();
  
  if (!result.valid) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED');
    console.error('Missing required environment variables:');
    result.missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    
    if (isProduction()) {
      console.error('\nApplication cannot start in production without required environment variables.');
      return false;
    } else {
      console.warn('\nContinuing in development mode, but some features may not work properly.');
    }
  } else {
    console.log('✅ Environment validation passed');
  }
  
  if (result.warnings.length > 0) {
    console.warn('\n⚠️ Environment warnings:');
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
  
  return true;
}

// =====================================
// FRONTEND ENVIRONMENT HELPERS
// =====================================

/**
 * Validate frontend environment variables (for use in client-side code)
 */
export function validateFrontendEnv(): {
  valid: boolean;
  config: {
    apiBaseUrl: string;
    stripePublicKey?: string;
    enableAnalytics: boolean;
    enableDebug: boolean;
  };
} {
  // Note: This function should be used in frontend code with import.meta.env
  const isDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev'));
  
  return {
    valid: true, // Frontend validation is less strict
    config: {
      apiBaseUrl: isDev ? '' : (import.meta?.env?.VITE_API_BASE_URL || ''),
      stripePublicKey: import.meta?.env?.VITE_STRIPE_PUBLIC_KEY,
      enableAnalytics: import.meta?.env?.VITE_ENABLE_ANALYTICS === 'true',
      enableDebug: import.meta?.env?.VITE_DEBUG === 'true' || isDev,
    }
  };
}