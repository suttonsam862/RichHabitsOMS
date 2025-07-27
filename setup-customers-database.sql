
-- ===============================================
-- COMPLETE CUSTOMERS PAGE DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor
-- ===============================================

-- Step 1: Ensure user_profiles table has email column (already done in fix-user-profiles-schema.sql)
-- This should already be run from the previous step

-- Step 2: Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS "customers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "company" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "country" TEXT DEFAULT 'United States',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 3: Create user_invitations table for invitation management
CREATE TABLE IF NOT EXISTS "user_invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'customer',
  "invitation_token" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status" TEXT DEFAULT 'pending',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "invited_by" UUID REFERENCES "user_profiles"("id")
);

-- Step 4: Enable RLS on all customer-related tables
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_invitations" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for user_profiles (for customer data access)
CREATE POLICY "Allow authenticated users to read customer profiles" 
ON "user_profiles" FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (role = 'customer' OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'salesperson')
  ))
);

CREATE POLICY "Allow service role to manage all profiles" 
ON "user_profiles" FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 6: Create RLS policies for customers table
CREATE POLICY "Allow authenticated users to read customers" 
ON "customers" FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow service role to manage customers" 
ON "customers" FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 7: Create RLS policies for user_invitations
CREATE POLICY "Allow admins to manage invitations" 
ON "user_invitations" FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR auth.jwt() ->> 'role' = 'service_role'
);

-- Step 8: Insert real customer data into user_profiles
INSERT INTO user_profiles (
  id,
  username,
  email,
  first_name,
  last_name,
  role,
  company,
  phone,
  created_at
) VALUES 
(
  gen_random_uuid(),
  'alice_johnson',
  'alice.johnson@techstartup.com',
  'Alice',
  'Johnson',
  'customer',
  'Tech Startup Inc',
  '555-0100',
  now()
),
(
  gen_random_uuid(),
  'bob_williams',
  'bob.williams@retailchain.com',
  'Bob',
  'Williams',
  'customer',
  'Retail Chain Corp',
  '555-0200',
  now()
),
(
  gen_random_uuid(),
  'carol_davis',
  'carol.davis@consulting.org',
  'Carol',
  'Davis',
  'customer',
  'Davis Consulting',
  '555-0300',
  now()
),
(
  gen_random_uuid(),
  'david_miller',
  'david.miller@sportsteam.net',
  'David',
  'Miller',
  'customer',
  'City Sports Team',
  '555-0400',
  now()
)
ON CONFLICT (email) DO NOTHING;

-- Step 9: Create corresponding customer records
INSERT INTO customers (
  user_id,
  first_name,
  last_name,
  email,
  company,
  phone,
  created_at
)
SELECT 
  up.id,
  up.first_name,
  up.last_name,
  up.email,
  up.company,
  up.phone,
  up.created_at
FROM user_profiles up 
WHERE up.role = 'customer'
AND NOT EXISTS (
  SELECT 1 FROM customers c WHERE c.user_id = up.id
);

-- Step 10: Verify the setup
SELECT 
  'Customer data verification:' as status,
  COUNT(*) as customer_count
FROM user_profiles 
WHERE role = 'customer';

SELECT 
  up.id,
  up.username,
  up.email,
  up.first_name,
  up.last_name,
  up.company,
  up.phone,
  up.created_at
FROM user_profiles up
WHERE up.role = 'customer'
ORDER BY up.created_at DESC;

-- Final success message
SELECT '✅ Customers Page Database Setup Complete!' as message;
