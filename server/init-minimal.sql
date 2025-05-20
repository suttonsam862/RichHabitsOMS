-- Minimal SQL for Supabase - only creates the essential user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'customer'
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows all operations
CREATE POLICY "Allow all operations" ON user_profiles FOR ALL USING (true);