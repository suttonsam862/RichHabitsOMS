
-- Create necessary types and enums
CREATE TYPE user_role AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE page_permission AS ENUM ('read', 'write', 'admin');

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'customer'
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settings_access BOOLEAN DEFAULT false
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID REFERENCES auth.users,
  page_name TEXT NOT NULL,
  permission page_permission DEFAULT 'read',
  PRIMARY KEY (user_id, page_name)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = auth.users.id AND role = 'admin'
    )
  );

-- Insert admin user
INSERT INTO auth.users (id, email, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'samsutton@rich-habits.com', 'admin');

INSERT INTO public.user_profiles (id, username, first_name, last_name, role, settings_access)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'samsutton',
  'Sam',
  'Sutton',
  'admin',
  true
);

-- Grant admin all permissions
INSERT INTO public.user_permissions (user_id, page_name, permission)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'dashboard', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'orders', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'customers', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'designers', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'manufacturers', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'settings', 'admin'),
  ('00000000-0000-0000-0000-000000000000', 'analytics', 'admin');
