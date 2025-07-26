
-- Verify User Management Database Setup
-- Run this to confirm everything is working correctly

-- Check if all tables exist
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE tablename IN (
    'custom_roles',
    'enhanced_user_profiles', 
    'permissions',
    'role_permissions',
    'user_sessions',
    'audit_logs',
    'user_invitations',
    'password_history',
    'user_activity',
    'security_incidents'
) 
ORDER BY tablename;

-- Check custom roles
SELECT id, name, display_name, is_system_role, is_active FROM custom_roles ORDER BY name;

-- Check permissions
SELECT id, resource, action, description FROM permissions ORDER BY resource, action;

-- Insert a test admin user if none exists
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
) VALUES (
    gen_random_uuid(),
    'admin',
    'admin@threadcraft.com',
    'System',
    'Administrator',
    'admin',
    'active',
    true,
    '{"*": ["*"]}',
    '{"system_admin": true}'
) ON CONFLICT (email) DO NOTHING;

-- Insert test users for different roles
INSERT INTO enhanced_user_profiles (
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    status,
    is_email_verified,
    permissions
) VALUES 
(
    gen_random_uuid(),
    'manager1',
    'manager@threadcraft.com',
    'Test',
    'Manager',
    'manager',
    'active',
    true,
    '{"users": ["read", "update"], "reports": ["read", "export"]}'
),
(
    gen_random_uuid(),
    'user1',
    'user@threadcraft.com',
    'Test',
    'User',
    'user',
    'active',
    true,
    '{"profile": ["read", "update"]}'
),
(
    gen_random_uuid(),
    'customer1',
    'customer@threadcraft.com',
    'Test',
    'Customer',
    'customer',
    'active',
    true,
    '{"orders": ["read", "create"], "profile": ["read", "update"]}'
)
ON CONFLICT (email) DO NOTHING;

-- Verify the data was inserted
SELECT 
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at
FROM enhanced_user_profiles 
ORDER BY role, username;

-- Check foreign key relationships work
SELECT 
    p.username,
    p.email,
    p.role,
    cr.name as custom_role_name,
    cr.display_name as custom_role_display
FROM enhanced_user_profiles p
LEFT JOIN custom_roles cr ON p.custom_role = cr.id
ORDER BY p.role, p.username;

-- Final verification message
SELECT 'User Management System Setup Complete! ✅' as status;
