-- Fix infinite recursion in user_profiles RLS policies
-- Apply directly through Supabase dashboard SQL editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Recreate policies without infinite recursion
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin access using JWT claims to avoid profile table lookup
CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        auth.jwt() ->> 'email' IN (
            'samsutton@rich-habits.com'
        ) OR 
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'is_super_admin')::boolean = true
    );

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;