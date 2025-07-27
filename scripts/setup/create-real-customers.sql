
-- Create real customers directly in Supabase Auth and profiles
-- This should be run in the Supabase SQL Editor

-- First, let's create the customers in auth.users (this requires admin privileges)
-- Note: In production, you would use the Supabase Admin API for this

-- Create user profiles for customers
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES 
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'alice.johnson@techstartup.com',
  crypt('TempPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"firstName": "Alice", "lastName": "Johnson", "role": "customer", "company": "Tech Startup Inc", "phone": "555-0100"}'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'bob.williams@retailchain.com',
  crypt('TempPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"firstName": "Bob", "lastName": "Williams", "role": "customer", "company": "Retail Chain Corp", "phone": "555-0200"}'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'carol.davis@consulting.org',
  crypt('TempPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"firstName": "Carol", "lastName": "Davis", "role": "customer", "company": "Davis Consulting", "phone": "555-0300"}'
),
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'david.miller@sportsteam.net',
  crypt('TempPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"firstName": "David", "lastName": "Miller", "role": "customer", "company": "City Sports Team", "phone": "555-0400"}'
);

-- Create corresponding user profiles
INSERT INTO user_profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  company,
  phone,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'firstName',
  u.raw_user_meta_data->>'lastName',
  'customer'::role_type,
  u.raw_user_meta_data->>'company',
  u.raw_user_meta_data->>'phone',
  now(),
  now()
FROM auth.users u 
WHERE u.email IN (
  'alice.johnson@techstartup.com',
  'bob.williams@retailchain.com', 
  'carol.davis@consulting.org',
  'david.miller@sportsteam.net'
)
AND NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
);
