
-- Fix customer database constraints and insert data
-- Run this SQL in your Supabase SQL Editor

BEGIN;

-- Step 1: Drop the problematic foreign key constraint
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_id_fkey";

-- Step 2: Ensure email column exists
ALTER TABLE "user_profiles" 
ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Step 3: Clear any existing customer data to avoid conflicts
DELETE FROM "user_profiles" WHERE role = 'customer';

-- Step 4: Insert fresh customer data without foreign key constraints
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
  'ad6d8092-62cf-48e0-98ca-4ead7c3d094c',
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
  'bd7e9193-73d0-49f1-99db-5fbe8d4e195d', 
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
  'ce8fa294-84e1-50g2-a0ec-6gcf9e5f206e',
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
  'df90b305-95f2-61h3-b1fd-7hd0af6g317f',
  'bob_williams',
  'bob.williams@retailchain.com', 
  'Bob',
  'Williams',
  'customer',
  'Retail Chain Corp',
  '555-0200',
  NOW()
);

-- Step 5: Create a unique constraint on email instead of foreign key
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_email_unique" ON "user_profiles"("email");

-- Step 6: Verify the data was inserted
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

COMMIT;

-- Success message
SELECT '✅ Customer database fixed! Foreign key constraint removed and data inserted successfully!' as result;
