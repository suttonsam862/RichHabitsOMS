
-- Create real customers directly in Supabase SQL Editor
-- Run this in your Supabase Dashboard > SQL Editor

-- First, let's create some test users in auth.users table
-- Note: This is a simplified approach for development

-- Insert sample customer data directly into your user_profiles table
-- assuming you have the table structure set up

INSERT INTO user_profiles (
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  company,
  phone,
  created_at,
  updated_at,
  is_active
) VALUES 
(
  gen_random_uuid(),
  'alice_johnson_' || floor(random() * 1000),
  'alice.johnson@techstartup.com',
  'Alice',
  'Johnson',
  'customer',
  'Tech Startup Inc',
  '555-0100',
  now(),
  now(),
  true
),
(
  gen_random_uuid(),
  'bob_williams_' || floor(random() * 1000),
  'bob.williams@retailchain.com',
  'Bob',
  'Williams',
  'customer',
  'Retail Chain Corp',
  '555-0200',
  now(),
  now(),
  true
),
(
  gen_random_uuid(),
  'carol_davis_' || floor(random() * 1000),
  'carol.davis@consulting.org',
  'Carol',
  'Davis',
  'customer',
  'Davis Consulting',
  '555-0300',
  now(),
  now(),
  true
),
(
  gen_random_uuid(),
  'david_miller_' || floor(random() * 1000),
  'david.miller@sportsteam.net',
  'David',
  'Miller',
  'customer',
  'City Sports Team',
  '555-0400',
  now(),
  now(),
  true
)
ON CONFLICT (email) DO NOTHING;

-- Verify the customers were created
SELECT 
  id,
  username,
  email,
  first_name,
  last_name,
  company,
  role,
  created_at
FROM user_profiles 
WHERE role = 'customer'
ORDER BY created_at DESC;
