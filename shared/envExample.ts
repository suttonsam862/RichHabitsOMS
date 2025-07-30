/**
 * ENVIRONMENT VARIABLE USAGE EXAMPLES
 * Demonstrates how to use the environment types and validation utilities
 */

import { 
  validateRequiredEnvVars, 
  getEnvironmentConfig, 
  isDevelopment, 
  isProduction,
  getEnvVar,
  getEnvNumber,
  getEnvBoolean,
  generateValidationReport,
  logEnvironmentValidation
} from './envValidation';

// =====================================
// EXAMPLE 1: STARTUP VALIDATION
// =====================================

export function initializeApplication() {
  console.log('🚀 INITIALIZING THREADCRAFT APPLICATION');
  
  // Validate environment on startup
  const validation = validateRequiredEnvVars();
  
  if (!validation.valid) {
    console.error('❌ Missing required environment variables:', validation.missing);
    if (isProduction()) {
      process.exit(1);
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:', validation.warnings);
  }
  
  console.log('✅ Environment validation passed');
  return validation.valid;
}

// =====================================
// EXAMPLE 2: CONFIGURATION MANAGEMENT
// =====================================

export function setupServices() {
  const config = getEnvironmentConfig();
  
  // Database configuration
  if (config.database.supabaseServiceKey) {
    console.log('🔧 Initializing Supabase admin client');
    // Initialize admin client
  } else {
    console.log('⚠️ Supabase service key not found, admin features disabled');
  }
  
  // Payment configuration
  if (config.features.enablePayments && config.payments.stripeSecretKey) {
    console.log('💳 Initializing Stripe payment processing');
    // Initialize Stripe
  } else {
    console.log('💳 Payment processing disabled');
  }
  
  // Email configuration
  if (config.features.enableEmail && config.email.sendgridApiKey) {
    console.log('📧 Initializing SendGrid email service');
    // Initialize SendGrid
  } else {
    console.log('📧 Email service disabled');
  }
  
  return config;
}

// =====================================
// EXAMPLE 3: TYPE-SAFE ENVIRONMENT ACCESS
// =====================================

export function getDatabaseConfig() {
  // Type-safe access to environment variables
  return {
    url: process.env.DATABASE_URL!, // TypeScript knows this is string
    supabaseUrl: process.env.SUPABASE_URL!, // TypeScript knows this is string
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!, // TypeScript knows this is string
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY, // TypeScript knows this is string | undefined
  };
}

export function getServerConfig() {
  return {
    port: getEnvNumber('PORT', 5000), // Returns number with default
    nodeEnv: process.env.NODE_ENV, // TypeScript knows the allowed values
    sessionSecret: process.env.SESSION_SECRET || 'development-secret',
    enableDebug: getEnvBoolean('DEBUG', isDevelopment()),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  };
}

// =====================================
// EXAMPLE 4: FEATURE FLAGS
// =====================================

export function configureFeatures() {
  const config = getEnvironmentConfig();
  
  const features = {
    payments: config.features.enablePayments,
    email: config.features.enableEmail,
    quickbooks: config.features.enableQuickbooks,
    fileUploads: config.features.enableFileUploads,
    realtime: config.features.enableRealtime,
  };
  
  console.log('🔧 Feature configuration:', features);
  return features;
}

// =====================================
// EXAMPLE 5: ENVIRONMENT-SPECIFIC BEHAVIOR
// =====================================

export function configureLogging() {
  if (isDevelopment()) {
    console.log('🔧 Development mode: Enhanced logging enabled');
    return {
      level: 'debug',
      format: 'pretty',
      enableSqlLogging: true,
    };
  }
  
  if (isProduction()) {
    console.log('🔧 Production mode: Structured logging enabled');
    return {
      level: 'info',
      format: 'json',
      enableSqlLogging: false,
    };
  }
  
  return {
    level: 'info',
    format: 'simple',
    enableSqlLogging: false,
  };
}

// =====================================
// EXAMPLE 6: COMPREHENSIVE STARTUP SEQUENCE
// =====================================

export async function startApplication() {
  try {
    // 1. Log environment validation
    logEnvironmentValidation();
    
    // 2. Initialize configuration
    const config = getEnvironmentConfig();
    console.log('📋 Application configuration loaded');
    
    // 3. Configure logging
    const loggingConfig = configureLogging();
    console.log('📝 Logging configured:', loggingConfig.level);
    
    // 4. Setup services
    const servicesConfig = setupServices();
    console.log('🔧 Services initialized');
    
    // 5. Configure features
    const features = configureFeatures();
    console.log('🎯 Features configured');
    
    // 6. Generate detailed report
    const report = generateValidationReport();
    console.log('\n' + report);
    
    console.log('✅ Application startup completed successfully');
    return { config, servicesConfig, features, loggingConfig };
    
  } catch (error) {
    console.error('❌ Application startup failed:', error);
    if (isProduction()) {
      process.exit(1);
    }
    throw error;
  }
}

// =====================================
// EXAMPLE 7: FRONTEND INTEGRATION
// =====================================

export function getFrontendConfig() {
  // This would typically be used in a frontend configuration file
  return {
    apiBaseUrl: import.meta?.env?.VITE_API_BASE_URL || '',
    stripePublicKey: import.meta?.env?.VITE_STRIPE_PUBLIC_KEY,
    enableAnalytics: import.meta?.env?.VITE_ENABLE_ANALYTICS === 'true',
    enableDebug: import.meta?.env?.VITE_DEBUG === 'true',
    appTitle: import.meta?.env?.VITE_APP_TITLE || 'ThreadCraft',
    appVersion: import.meta?.env?.VITE_APP_VERSION || '1.0.0',
  };
}

// =====================================
// EXAMPLE 8: RUNTIME ENVIRONMENT CHECKS
// =====================================

export function validateRuntimeEnvironment() {
  const checks = {
    hasDatabase: !!process.env.DATABASE_URL,
    hasSupabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY,
    hasStripe: !!process.env.STRIPE_SECRET_KEY,
    hasEmail: !!process.env.SENDGRID_API_KEY,
    hasSession: !!process.env.SESSION_SECRET,
  };
  
  const criticalFailures = [];
  if (!checks.hasDatabase) criticalFailures.push('Database connection');
  if (!checks.hasSupabase) criticalFailures.push('Supabase configuration');
  
  if (criticalFailures.length > 0) {
    console.error('💀 Critical environment failures:', criticalFailures);
    return false;
  }
  
  console.log('✅ Runtime environment validation passed');
  return true;
}

// =====================================
// EXAMPLE 9: ENVIRONMENT MIGRATION
// =====================================

export function migrateEnvironmentConfig() {
  // Helper for migrating old environment variable names
  const migrations = [
    { old: 'SUPABASE_KEY', new: 'SUPABASE_ANON_KEY' },
    { old: 'DB_URL', new: 'DATABASE_URL' },
    { old: 'STRIPE_KEY', new: 'STRIPE_SECRET_KEY' },
  ];
  
  let needsMigration = false;
  
  migrations.forEach(({ old, new: newVar }) => {
    if (process.env[old] && !process.env[newVar]) {
      console.warn(`⚠️ Deprecated environment variable: ${old} -> ${newVar}`);
      process.env[newVar] = process.env[old];
      needsMigration = true;
    }
  });
  
  if (needsMigration) {
    console.warn('⚠️ Please update your environment variables to use the new names');
  }
  
  return needsMigration;
}

// =====================================
// EXAMPLE 10: HEALTH CHECK ENDPOINTS
// =====================================

export function createHealthCheckResponse() {
  const config = getEnvironmentConfig();
  const validation = validateRequiredEnvVars();
  
  return {
    status: validation.valid ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: config.features,
    services: {
      database: !!config.database.url,
      supabase: !!config.database.supabaseUrl,
      stripe: !!config.payments.stripeSecretKey,
      email: !!config.email.sendgridApiKey,
    },
    validation: {
      valid: validation.valid,
      missing: validation.missing,
      warnings: validation.warnings.length,
    }
  };
}