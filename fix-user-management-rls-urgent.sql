-- Fix infinite recursion in RLS policies for enhanced_user_profiles
-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "enhanced_user_profiles_select_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "enhanced_user_profiles_insert_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "enhanced_user_profiles_update_policy" ON enhanced_user_profiles;
DROP POLICY IF EXISTS "enhanced_user_profiles_delete_policy" ON enhanced_user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "enhanced_user_profiles_select_policy" ON enhanced_user_profiles
  FOR SELECT USING (true);

CREATE POLICY "enhanced_user_profiles_insert_policy" ON enhanced_user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "enhanced_user_profiles_update_policy" ON enhanced_user_profiles
  FOR UPDATE USING (true);

CREATE POLICY "enhanced_user_profiles_delete_policy" ON enhanced_user_profiles
  FOR DELETE USING (true);

-- Ensure RLS is enabled
ALTER TABLE enhanced_user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT ALL ON enhanced_user_profiles TO authenticated;
GRANT ALL ON enhanced_user_profiles TO anon;