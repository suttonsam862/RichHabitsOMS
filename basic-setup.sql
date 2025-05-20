-- Simple script for Supabase to create just the essential tables

-- Create role type enum (without IF NOT EXISTS)
DO $$ BEGIN
    CREATE TYPE role_type AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role role_type NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add a simple policy
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS all_access ON user_profiles;

-- Create a policy that allows all operations
CREATE POLICY all_access ON user_profiles FOR ALL USING (true);

-- Basic customer table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- Add a simple policy for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS all_access ON customers;
CREATE POLICY all_access ON customers FOR ALL USING (true);