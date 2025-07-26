-- Fix User Management RLS Infinite Recursion
-- Run this in Supabase SQL Editor

BEGIN;

-- Disable RLS temporarily to fix policies
ALTER TABLE enhanced_user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "simple_user_profiles_select" ON enhanced_user_profiles;

-- Create simple, non-recursive policies that reference auth.users directly
CREATE POLICY "enhanced_profiles_select" ON enhanced_user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
      )
    )
  );

CREATE POLICY "enhanced_profiles_insert" ON enhanced_user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
      )
    )
  );

CREATE POLICY "enhanced_profiles_update" ON enhanced_user_profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
      )
    )
  );

CREATE POLICY "enhanced_profiles_delete" ON enhanced_user_profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'is_super_admin' = 'true'
      )
    )
  );

-- Re-enable RLS
ALTER TABLE enhanced_user_profiles ENABLE ROW LEVEL SECURITY;

-- Custom roles policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON custom_roles;
CREATE POLICY "Allow read access to custom roles" ON custom_roles
FOR SELECT USING (true);

-- Permissions policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON permissions;
CREATE POLICY "Allow read access to permissions" ON permissions
FOR SELECT USING (true);

-- Role permissions policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON role_permissions;
CREATE POLICY "Allow read access to role permissions" ON role_permissions
FOR SELECT USING (true);

-- User sessions policies
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
CREATE POLICY "Users can manage their own sessions" ON user_sessions
FOR ALL USING (
  auth.uid()::text = user_id::text
  OR
  (auth.jwt() ->> 'role' = 'admin')
);

-- Audit logs policies
DROP POLICY IF EXISTS "Admin users can read audit logs" ON audit_logs;
CREATE POLICY "Admin users can read audit logs" ON audit_logs
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- User invitations policies
DROP POLICY IF EXISTS "Admin users can manage invitations" ON user_invitations;
CREATE POLICY "Admin users can manage invitations" ON user_invitations
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Password history policies
DROP POLICY IF EXISTS "Users can view their password history" ON password_history;
CREATE POLICY "Users can view their password history" ON password_history
FOR SELECT USING (
  auth.uid()::text = user_id::text
  OR
  (auth.jwt() ->> 'role' = 'admin')
);

-- User activity policies
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
CREATE POLICY "Users can view their own activity" ON user_activity
FOR SELECT USING (
  auth.uid()::text = user_id::text
  OR
  (auth.jwt() ->> 'role' = 'admin')
);

-- Security incidents policies
DROP POLICY IF EXISTS "Admin users can view security incidents" ON security_incidents;
CREATE POLICY "Admin users can view security incidents" ON security_incidents
FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Verify the setup
SELECT 'RLS Policies Fixed Successfully' as status;

COMMIT;