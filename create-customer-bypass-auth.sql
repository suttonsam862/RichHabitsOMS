-- Create customer bypassing Supabase Auth to test database schema
-- This helps isolate auth issues from database schema issues

-- First check if customer already exists
SELECT id, email, first_name, last_name 
FROM customers 
WHERE email = 'test-bypass@example.com';

-- Insert directly into customers table
INSERT INTO customers (
  id,
  first_name,
  last_name,
  email,
  company,
  phone,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Bypass',
  'Customer',
  'test-bypass@example.com',
  'Bypass Company',
  '555-0000',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Check insertion success
SELECT id, email, first_name, last_name, created_at
FROM customers 
WHERE email = 'test-bypass@example.com';

-- Count total customers after insertion
SELECT COUNT(*) as total_customers FROM customers;