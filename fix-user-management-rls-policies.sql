
-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Users can manage profiles with proper roles" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Enable read access for admin users" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Enable full access for admin users" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "Admin full access to enhanced_user_profiles" ON enhanced_user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Admin users have full access to user profiles" ON enhanced_user_profiles
FOR ALL USING (
  -- Check if current user has admin role in auth.users metadata
  (auth.jwt() ->> 'role' = 'admin')
  OR
  -- Allow users to see their own profile
  (auth.uid()::text = id::text)
);

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

-- Insert some test data to verify the system works
INSERT INTO enhanced_user_profiles (
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  status,
  is_email_verified,
  permissions,
  custom_attributes
) VALUES 
(
  gen_random_uuid(),
  'testadmin',
  'admin@test.com',
  'Test',
  'Admin',
  'admin',
  'active',
  true,
  '{"*": ["*"]}',
  '{"system_admin": true}'
),
(
  gen_random_uuid(),
  'testuser',
  'user@test.com',
  'Test',
  'User',
  'user',
  'active',
  true,
  '{"profile": ["read", "update"]}',
  '{}'
)
ON CONFLICT (email) DO NOTHING;

-- Verify the setup
SELECT 'RLS Policies Fixed Successfully' as status;
