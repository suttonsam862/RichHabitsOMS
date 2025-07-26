import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Security and authentication enums
export const mfaMethodEnum = pgEnum('mfa_method', ['totp', 'sms', 'email', 'hardware_key']);
export const securityEventEnum = pgEnum('security_event', [
  'login_success', 'login_failure', 'password_change', 'mfa_enabled', 'mfa_disabled',
  'account_locked', 'account_unlocked', 'suspicious_activity', 'permission_escalation'
]);

// Multi-factor authentication setup
export const userMfaDevices = pgTable('user_mfa_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceName: text('device_name').notNull(),
  method: mfaMethodEnum('method').notNull(),
  secret: text('secret'), // For TOTP
  phoneNumber: text('phone_number'), // For SMS
  isActive: boolean('is_active').default(true),
  isBackup: boolean('is_backup').default(false),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Password policy enforcement
export const passwordPolicies = pgTable('password_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  minLength: integer('min_length').default(8),
  requireUppercase: boolean('require_uppercase').default(true),
  requireLowercase: boolean('require_lowercase').default(true),
  requireNumbers: boolean('require_numbers').default(true),
  requireSpecialChars: boolean('require_special_chars').default(true),
  preventReuse: integer('prevent_reuse').default(5), // Last N passwords
  maxAge: integer('max_age_days').default(90), // Force reset after N days
  lockoutAttempts: integer('lockout_attempts').default(5),
  lockoutDuration: integer('lockout_duration_minutes').default(30),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// IP restrictions and geofencing
export const ipRestrictions = pgTable('ip_restrictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  roleId: uuid('role_id'),
  ipAddress: text('ip_address'),
  ipRange: text('ip_range'), // CIDR notation
  country: text('country'),
  region: text('region'),
  isAllowed: boolean('is_allowed').default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Security questions for password reset
export const securityQuestions = pgTable('security_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSecurityAnswers = pgTable('user_security_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  questionId: uuid('question_id').notNull(),
  answerHash: text('answer_hash').notNull(), // Hashed answer
  createdAt: timestamp('created_at').defaultNow(),
});

// Security events logging
export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  sessionId: uuid('session_id'),
  eventType: securityEventEnum('event_type').notNull(),
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  description: text('description').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  location: jsonb('location'),
  metadata: jsonb('metadata'),
  resolved: boolean('resolved').default(false),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User device tracking
export const userDevices = pgTable('user_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  deviceId: text('device_id').notNull(), // Browser fingerprint or device ID
  deviceName: text('device_name'),
  deviceType: text('device_type'), // 'desktop', 'mobile', 'tablet'
  browser: text('browser'),
  os: text('os'),
  isTrusted: boolean('is_trusted').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Permission templates for quick role setup
export const permissionTemplates = pgTable('permission_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').notNull(),
  category: text('category'), // 'sales', 'admin', 'production', etc.
  isSystemTemplate: boolean('is_system_template').default(false),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Time-based permission restrictions
export const temporaryPermissions = pgTable('temporary_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
  grantedBy: uuid('granted_by').notNull(),
  reason: text('reason'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isActive: boolean('is_active').default(true),
  autoRevoke: boolean('auto_revoke').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Create insert schemas
export const insertUserMfaDeviceSchema = createInsertSchema(userMfaDevices).omit({
  id: true, createdAt: true
});

export const insertPasswordPolicySchema = createInsertSchema(passwordPolicies).omit({
  id: true, createdAt: true
});

export const insertIpRestrictionSchema = createInsertSchema(ipRestrictions).omit({
  id: true, createdAt: true
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true, createdAt: true
});

export const insertPermissionTemplateSchema = createInsertSchema(permissionTemplates).omit({
  id: true, createdAt: true
});

// Type exports
export type UserMfaDevice = typeof userMfaDevices.$inferSelect;
export type PasswordPolicy = typeof passwordPolicies.$inferSelect;
export type IpRestriction = typeof ipRestrictions.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type TemporaryPermission = typeof temporaryPermissions.$inferSelect;