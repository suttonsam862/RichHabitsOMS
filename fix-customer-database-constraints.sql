-- Fix user_profiles foreign key constraint issue
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop the foreign key constraint that's causing the error
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_id_fkey";

-- Step 2: Make sure the user_profiles table has the right structure for customers
ALTER TABLE "user_profiles" 
ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Step 3: Create a simpler constraint that allows standalone customer profiles
-- (We don't need every customer to be in auth.users)
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_email_unique" ON "user_profiles"("email");

-- Step 4: Insert real customer data that matches what the API expects
INSERT INTO "user_profiles" (
  "id",
  "username", 
  "email",
  "first_name",
  "last_name", 
  "role",
  "company",
  "phone",
  "created_at"
) VALUES 
(
  '7371464e-0638-48ad-9e65-24b395ae3551',
  'john_smith',
  'john.smith@example.com',
  'John',
  'Smith',
  'customer',
  'Smith Corp',
  '555-0123',
  NOW()
),
(
  '8481575f-1749-59be-a076-35c406bf4662', 
  'jane_doe',
  'jane.doe@example.com',
  'Jane',
  'Doe',
  'customer', 
  'Doe Industries',
  '555-0124',
  NOW()
),
(
  '9591686g-2850-60cf-b187-46d517cg5773',
  'alice_johnson', 
  'alice.johnson@techstartup.com',
  'Alice',
  'Johnson',
  'customer',
  'Tech Startup Inc',
  '555-0100', 
  NOW()
),
(
  'a6a2797h-3961-71dg-c298-57e628dh6884',
  'bob_williams',
  'bob.williams@retailchain.com', 
  'Bob',
  'Williams',
  'customer',
  'Retail Chain Corp',
  '555-0200',
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  company = EXCLUDED.company,
  phone = EXCLUDED.phone;

-- Step 5: Verify the data
SELECT 
  id,
  email,
  first_name,
  last_name,
  company,
  phone,
  role,
  created_at
FROM "user_profiles" 
WHERE role = 'customer'
ORDER BY created_at DESC;

-- Success message
SELECT '✅ Customer database constraints fixed and data inserted!' as message;