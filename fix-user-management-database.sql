
-- Fix User Management Database Issues
-- Run this in Supabase SQL Editor

-- First, create the user management tables if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums for user management
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'terminated', 'pending_activation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'expired', 'terminated', 'invalid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE permission_action AS ENUM ('create', 'read', 'update', 'delete', 'approve', 'reject', 'export', 'import');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'permission_change', 'role_change');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create custom_roles table first (referenced by enhanced_user_profiles)
CREATE TABLE IF NOT EXISTS custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    inherits_from UUID REFERENCES custom_roles(id),
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- Create enhanced_user_profiles table with proper foreign key
CREATE TABLE IF NOT EXISTS enhanced_user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    custom_role UUID REFERENCES custom_roles(id),
    phone TEXT,
    company TEXT,
    department TEXT,
    title TEXT,
    profile_picture TEXT,
    
    -- Status and lifecycle
    status user_status NOT NULL DEFAULT 'pending_activation',
    is_email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    password_last_changed TIMESTAMP WITH TIME ZONE,
    
    -- Security and access
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    
    -- Extended profile information
    emergency_contact JSONB,
    skills JSONB,
    certifications JSONB,
    territory_assignment TEXT,
    language_preference TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    
    -- Custom attributes and metadata
    custom_attributes JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_by UUID
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action permission_action NOT NULL,
    conditions JSONB,
    description TEXT,
    is_system_permission BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT TRUE,
    conditions JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES enhanced_user_profiles(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    device TEXT,
    location JSONB,
    status session_status DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES enhanced_user_profiles(id),
    session_id UUID REFERENCES user_sessions(id),
    action audit_action NOT NULL,
    resource TEXT,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT NOT NULL,
    custom_role UUID REFERENCES custom_roles(id),
    invitation_token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES enhanced_user_profiles(id),
    accepted_by UUID REFERENCES enhanced_user_profiles(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create password_history table
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES enhanced_user_profiles(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES enhanced_user_profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id),
    page TEXT,
    action TEXT,
    duration INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security_incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES enhanced_user_profiles(id),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES enhanced_user_profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_email ON enhanced_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_username ON enhanced_user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_role ON enhanced_user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_custom_role ON enhanced_user_profiles(custom_role);
CREATE INDEX IF NOT EXISTS idx_enhanced_user_profiles_status ON enhanced_user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_roles(name);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Insert default system roles
INSERT INTO custom_roles (name, display_name, description, permissions, is_system_role, is_active) VALUES
('admin', 'Administrator', 'Full system access with all permissions', '{"*": ["*"]}', TRUE, TRUE),
('manager', 'Manager', 'Management access with user oversight capabilities', '{"users": ["read", "update"], "reports": ["read", "export"]}', TRUE, TRUE),
('user', 'Standard User', 'Basic user access with limited permissions', '{"profile": ["read", "update"]}', TRUE, TRUE),
('viewer', 'Viewer', 'Read-only access to assigned resources', '{"assigned": ["read"]}', TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (resource, action, description, is_system_permission) VALUES
('users', 'create', 'Create new users', TRUE),
('users', 'read', 'View user information', TRUE),
('users', 'update', 'Update user information', TRUE),
('users', 'delete', 'Delete users', TRUE),
('roles', 'create', 'Create new roles', TRUE),
('roles', 'read', 'View role information', TRUE),
('roles', 'update', 'Update role information', TRUE),
('roles', 'delete', 'Delete roles', TRUE),
('permissions', 'create', 'Create new permissions', TRUE),
('permissions', 'read', 'View permission information', TRUE),
('permissions', 'update', 'Update permission information', TRUE),
('permissions', 'delete', 'Delete permissions', TRUE),
('catalog', 'create', 'Create catalog items', TRUE),
('catalog', 'read', 'View catalog items', TRUE),
('catalog', 'update', 'Update catalog items', TRUE),
('catalog', 'delete', 'Delete catalog items', TRUE),
('orders', 'create', 'Create orders', TRUE),
('orders', 'read', 'View orders', TRUE),
('orders', 'update', 'Update orders', TRUE),
('orders', 'delete', 'Delete orders', TRUE)
ON CONFLICT (resource, action) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow service role to bypass RLS
CREATE POLICY "service_role_bypass" ON custom_roles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON enhanced_user_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON permissions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON role_permissions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON user_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON audit_logs FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON user_invitations FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON password_history FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON user_activity FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_bypass" ON security_incidents FOR ALL TO service_role USING (true);

-- Allow authenticated users to read system roles and permissions
CREATE POLICY "authenticated_read_roles" ON custom_roles FOR SELECT TO authenticated USING (is_system_role = true OR is_active = true);
CREATE POLICY "authenticated_read_permissions" ON permissions FOR SELECT TO authenticated USING (true);

-- Users can view their own profile
CREATE POLICY "users_own_profile" ON enhanced_user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" ON enhanced_user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Admin users can view all profiles
CREATE POLICY "admin_view_all_profiles" ON enhanced_user_profiles FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM enhanced_user_profiles admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
);

-- Admin users can manage all profiles
CREATE POLICY "admin_manage_all_profiles" ON enhanced_user_profiles FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM enhanced_user_profiles admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'admin'
    )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON custom_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enhanced_user_profiles_updated_at BEFORE UPDATE ON enhanced_user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
