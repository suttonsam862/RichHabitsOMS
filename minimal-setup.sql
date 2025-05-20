-- Minimal setup for authentication

-- Create role enum safely
DO $$ 
BEGIN
  CREATE TYPE role_type AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop table if it exists to start fresh
DROP TABLE IF EXISTS user_profiles;

-- Create minimal user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  role role_type NOT NULL DEFAULT 'customer'
);

-- Allow all operations on this table for now
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON user_profiles FOR ALL USING (true);