import { pgTable, text, timestamp, boolean, jsonb, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced enums for user management
export const userStatusEnum = pgEnum('user_status', [
  'active', 'inactive', 'suspended', 'terminated', 'pending_activation'
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'active', 'expired', 'terminated', 'invalid'
]);

export const permissionActionEnum = pgEnum('permission_action', [
  'create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import'
]);

export const auditActionEnum = pgEnum('audit_action', [
  'login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'permission_change', 'role_change'
]);

// Enhanced user profiles with comprehensive management features
export const enhancedUserProfiles = pgTable('enhanced_user_profiles', {
  id: uuid('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull().default('customer'),
  customRole: text('custom_role'), // For dynamic custom roles
  phone: text('phone'),
  company: text('company'),
  department: text('department'),
  title: text('title'),
  profilePicture: text('profile_picture'),
  
  // Status and lifecycle
  status: userStatusEnum('status').notNull().default('pending_activation'),
  isEmailVerified: boolean('is_email_verified').default(false),
  lastLogin: timestamp('last_login'),
  lastActivity: timestamp('last_activity'),
  passwordLastChanged: timestamp('password_last_changed'),
  
  // Security and access
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  accountLockedUntil: timestamp('account_locked_until'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  
  // Extended profile information
  emergencyContact: jsonb('emergency_contact'),
  skills: jsonb('skills'),
  certifications: jsonb('certifications'),
  territoryAssignment: text('territory_assignment'),
  languagePreference: text('language_preference').default('en'),
  timezone: text('timezone').default('UTC'),
  
  // Custom attributes and metadata
  customAttributes: jsonb('custom_attributes').default({}),
  permissions: jsonb('permissions').default({}),
  preferences: jsonb('preferences').default({}),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: uuid('created_by'),
  lastModifiedBy: uuid('last_modified_by'),
});

// Dynamic roles system
export const customRoles = pgTable('custom_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  inheritsFrom: uuid('inherits_from'),
  permissions: jsonb('permissions').notNull().default({}),
  isSystemRole: boolean('is_system_role').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: uuid('created_by'),
});

// Add self-reference after table definition
// Relations for customRoles
export const customRolesRelations = relations(customRoles, ({ one, many }) => ({
  parent: one(customRoles, {
    fields: [customRoles.inheritsFrom],
    references: [customRoles.id],
  }),
  children: many(customRoles),
}));

// Permissions system
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resource: text('resource').notNull(), // e.g., 'orders', 'catalog', 'users'
  action: permissionActionEnum('action').notNull(),
  conditions: jsonb('conditions'), // Conditional logic for permissions
  description: text('description'),
  isSystemPermission: boolean('is_system_permission').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Role-Permission assignments
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').notNull().references(() => customRoles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  granted: boolean('granted').default(true),
  conditions: jsonb('conditions'), // Override conditions for this specific assignment
  expiresAt: timestamp('expires_at'), // Temporary permissions
  grantedBy: uuid('granted_by'),
  grantedAt: timestamp('granted_at').defaultNow(),
});

// User sessions tracking
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => enhancedUserProfiles.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  device: text('device'),
  location: jsonb('location'), // Geographic location data
  status: sessionStatusEnum('status').default('active'),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivity: timestamp('last_activity').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Comprehensive audit logging
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => enhancedUserProfiles.id),
  sessionId: uuid('session_id').references(() => userSessions.id),
  action: auditActionEnum('action').notNull(),
  resource: text('resource'), // What was accessed/modified
  resourceId: text('resource_id'), // ID of the specific resource
  oldValues: jsonb('old_values'), // Previous state for updates
  newValues: jsonb('new_values'), // New state for updates
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'), // Additional context
  timestamp: timestamp('timestamp').defaultNow(),
});

// User invitations system
export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role').notNull(),
  customRole: text('custom_role'),
  invitationToken: text('invitation_token').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => enhancedUserProfiles.id),
  acceptedBy: uuid('accepted_by').references(() => enhancedUserProfiles.id),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  metadata: jsonb('metadata'), // Custom invitation data
  createdAt: timestamp('created_at').defaultNow(),
});

// Password history for policy enforcement
export const passwordHistory = pgTable('password_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => enhancedUserProfiles.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// User activity tracking for analytics
export const userActivity = pgTable('user_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => enhancedUserProfiles.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => userSessions.id),
  page: text('page'),
  action: text('action'),
  duration: integer('duration'), // Time spent in seconds
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Security incidents tracking
export const securityIncidents = pgTable('security_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => enhancedUserProfiles.id),
  incidentType: text('incident_type').notNull(), // 'suspicious_login', 'permission_escalation', etc.
  severity: text('severity').notNull(), // 'low', 'medium', 'high', 'critical'
  description: text('description').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  resolved: boolean('resolved').default(false),
  resolvedBy: uuid('resolved_by').references(() => enhancedUserProfiles.id),
  resolvedAt: timestamp('resolved_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Create insert schemas
export const insertEnhancedUserProfileSchema = createInsertSchema(enhancedUserProfiles).omit({ 
  id: true, createdAt: true, updatedAt: true 
});

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({ 
  id: true, createdAt: true, updatedAt: true 
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ 
  id: true, createdAt: true 
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({ 
  id: true, createdAt: true, acceptedAt: true 
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ 
  id: true, timestamp: true 
});

// Types
export type EnhancedUserProfile = typeof enhancedUserProfiles.$inferSelect;
export type InsertEnhancedUserProfile = z.infer<typeof insertEnhancedUserProfileSchema>;

export type CustomRole = typeof customRoles.$inferSelect;
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type UserActivity = typeof userActivity.$inferSelect;
export type SecurityIncident = typeof securityIncidents.$inferSelect;

// Validation schemas for API endpoints
export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.string(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  sendInvitation: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  customAttributes: z.record(z.any()).optional(),
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  inheritsFrom: z.string().uuid().optional(),
  permissions: z.record(z.any()),
});

export const assignPermissionSchema = z.object({
  roleId: z.string().uuid(),
  permissionId: z.string().uuid(),
  granted: z.boolean().default(true),
  conditions: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type CreateRoleData = z.infer<typeof createRoleSchema>;
export type AssignPermissionData = z.infer<typeof assignPermissionSchema>;