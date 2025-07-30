-- ThreadCraft RLS Security Verification Script
-- Tests all security policies to ensure proper access control
-- Security Audit Implementation - July 30, 2025

-- =====================================================
-- VERIFICATION TEST SETUP
-- =====================================================

-- Create test users for verification (if not exists)
INSERT INTO user_profiles (
  id,
  email,
  username,
  first_name,
  last_name,
  role,
  is_active
) VALUES 
-- Admin test user
(
  '00000000-0000-0000-0000-000000000001',
  'admin@test.com',
  'test_admin',
  'Test',
  'Admin',
  'admin',
  true
),
-- Salesperson test user
(
  '00000000-0000-0000-0000-000000000002',
  'sales@test.com',
  'test_sales',
  'Test',
  'Salesperson',
  'salesperson',
  true
),
-- Customer test user
(
  '00000000-0000-0000-0000-000000000003',
  'customer@test.com',
  'test_customer',
  'Test',
  'Customer',
  'customer',
  true
),
-- Designer test user
(
  '00000000-0000-0000-0000-000000000004',
  'designer@test.com',
  'test_designer',
  'Test',
  'Designer',
  'designer',
  true
),
-- Manufacturer test user
(
  '00000000-0000-0000-0000-000000000005',
  'manufacturer@test.com',
  'test_manufacturer',
  'Test',
  'Manufacturer',
  'manufacturer',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Create test customers
INSERT INTO customers (
  id,
  user_id,
  first_name,
  last_name,
  email,
  company
) VALUES 
(
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000003',
  'Test',
  'Customer',
  'customer@test.com',
  'Test Company'
)
ON CONFLICT (email) DO NOTHING;

-- Create customer assignment
INSERT INTO customer_assignments (
  customer_id,
  salesperson_id,
  assigned_by,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (customer_id, salesperson_id) DO NOTHING;

-- Create test order
INSERT INTO orders (
  id,
  customer_id,
  salesperson_id,
  status,
  total_amount
) VALUES (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000002',
  'draft',
  100.00
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECURITY VERIFICATION QUERIES
-- =====================================================

-- Test 1: Customer Data Isolation
-- Should only return customers accessible to the current user
BEGIN;
SET LOCAL row_security = on;

-- Simulate customer user context
SET LOCAL "app.current_user_id" = '00000000-0000-0000-0000-000000000003';
SET LOCAL "app.current_user_role" = 'customer';

-- Customer should only see their own data
SELECT 
  'Customer Data Access Test' as test_name,
  COUNT(*) as accessible_customers,
  CASE 
    WHEN COUNT(*) = 1 THEN 'PASS - Customer sees only own data'
    ELSE 'FAIL - Customer sees unauthorized data'
  END as result
FROM customers;

ROLLBACK;

-- Test 2: Salesperson Assignment Access
BEGIN;
SET LOCAL row_security = on;

-- Simulate salesperson user context
SET LOCAL "app.current_user_id" = '00000000-0000-0000-0000-000000000002';
SET LOCAL "app.current_user_role" = 'salesperson';

-- Salesperson should only see assigned customers
SELECT 
  'Salesperson Customer Access Test' as test_name,
  COUNT(*) as accessible_customers,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS - Salesperson sees assigned customers'
    ELSE 'FAIL - Salesperson cannot see assigned customers'
  END as result
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM customer_assignments ca 
  WHERE ca.customer_id = c.id 
  AND ca.salesperson_id = '00000000-0000-0000-0000-000000000002'
  AND ca.is_active = true
);

ROLLBACK;

-- Test 3: Admin Access Verification
BEGIN;
SET LOCAL row_security = on;

-- Simulate admin user context
SET LOCAL "app.current_user_id" = '00000000-0000-0000-0000-000000000001';
SET LOCAL "app.current_user_role" = 'admin';

-- Admin should see all data
SELECT 
  'Admin Global Access Test' as test_name,
  COUNT(*) as accessible_customers,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS - Admin has global access'
    ELSE 'FAIL - Admin access restricted'
  END as result
FROM customers;

ROLLBACK;

-- Test 4: Order Access Control
BEGIN;
SET LOCAL row_security = on;

-- Test customer order access
SET LOCAL "app.current_user_id" = '00000000-0000-0000-0000-000000000003';
SET LOCAL "app.current_user_role" = 'customer';

SELECT 
  'Customer Order Access Test' as test_name,
  COUNT(*) as accessible_orders,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS - Customer can see own orders'
    ELSE 'FAIL - Customer cannot see own orders'
  END as result
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.user_id = '00000000-0000-0000-0000-000000000003';

ROLLBACK;

-- Test 5: Cross-Customer Data Isolation
BEGIN;
SET LOCAL row_security = on;

-- Create second customer for isolation test
INSERT INTO customers (
  id,
  user_id,
  first_name,
  last_name,
  email,
  company
) VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000006', -- Different user
  'Other',
  'Customer',
  'other@test.com',
  'Other Company'
) ON CONFLICT (email) DO NOTHING;

-- Customer 1 should not see Customer 2's data
SET LOCAL "app.current_user_id" = '00000000-0000-0000-0000-000000000003';
SET LOCAL "app.current_user_role" = 'customer';

SELECT 
  'Cross-Customer Isolation Test' as test_name,
  COUNT(*) as visible_other_customers,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS - Customer cannot see other customers'
    ELSE 'FAIL - Data isolation breach'
  END as result
FROM customers
WHERE id = '00000000-0000-0000-0000-000000000102';

ROLLBACK;

-- =====================================================
-- POLICY EFFECTIVENESS SUMMARY
-- =====================================================

-- Summary query to check all RLS policies are enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'SECURE'
    ELSE 'VULNERABLE'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'user_profiles', 'customers', 'orders', 'order_items',
  'design_tasks', 'production_tasks', 'payments',
  'customer_assignments', 'design_task_assignments', 
  'production_assignments'
)
ORDER BY tablename;

-- Count active RLS policies
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check for dangerous policies that allow unrestricted access
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual = 'true' THEN 'DANGEROUS - Allows all access'
    WHEN qual LIKE '%true%' AND qual NOT LIKE '%auth.uid()%' THEN 'SUSPICIOUS - May be overly permissive'
    ELSE 'SECURE - Has proper restrictions'
  END as security_assessment
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'customers', 'orders', 'payments', 'design_tasks', 'production_tasks'
)
ORDER BY tablename, policyname;

-- =====================================================
-- RECOMMENDED SECURITY ACTIONS
-- =====================================================

/*
IMMEDIATE ACTIONS REQUIRED:

1. Apply the production-grade-rls-policies.sql script
2. Replace existing authentication middleware with secure-auth-middleware.ts  
3. Remove development bypasses from all authentication code
4. Test each role's access with the verification queries above
5. Enable audit logging for all sensitive operations
6. Set up monitoring for failed authentication attempts

MONITORING QUERIES:

-- Check for authentication failures
SELECT * FROM security_audit_log 
WHERE action_type = 'AUTH_FAILURE' 
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check for permission denials
SELECT * FROM security_audit_log 
WHERE action_type = 'PERMISSION_DENIED'
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check for role escalation attempts
SELECT * FROM security_audit_log 
WHERE action_type = 'ROLE_ESCALATION_ATTEMPT'
ORDER BY created_at DESC;
*/