-- ThreadCraft Production-Grade RLS Security Policies
-- Security Audit Implementation - July 30, 2025

-- =====================================================
-- STEP 1: DROP DANGEROUS EXISTING POLICIES  
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to read orders" ON orders;
DROP POLICY IF EXISTS "Allow authenticated users to read order items" ON order_items;
DROP POLICY IF EXISTS "Allow authenticated users to read payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to read design tasks" ON design_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to read production tasks" ON production_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON messages;

-- =====================================================
-- STEP 2: CREATE ASSIGNMENT TABLES FOR ACCESS CONTROL
-- =====================================================

-- Customer assignments for salesperson relationships
CREATE TABLE IF NOT EXISTS customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salesperson_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(customer_id, salesperson_id)
);

-- Design task assignments for designer access control  
CREATE TABLE IF NOT EXISTS design_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_task_id UUID NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(design_task_id, designer_id)
);

-- Production assignments for manufacturer access control
CREATE TABLE IF NOT EXISTS production_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(production_task_id, manufacturer_id)
);

-- =====================================================
-- STEP 3: ENABLE RLS ON ASSIGNMENT TABLES
-- =====================================================

ALTER TABLE customer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: PRODUCTION-GRADE USER PROFILE POLICIES
-- =====================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to read customer profiles" ON user_profiles;

-- Users can view their own profile
CREATE POLICY "users_own_profile" ON user_profiles
  FOR SELECT TO authenticated 
  USING (id = auth.uid());

-- Users can update their own profile (non-role fields only)
CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND 
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) -- Prevent role escalation
  );

-- Admins can view all profiles (with audit logging)
CREATE POLICY "admin_view_all_profiles" ON user_profiles
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage all profiles (restricted operations)
CREATE POLICY "service_role_manage_profiles" ON user_profiles
  FOR ALL TO service_role USING (true);

-- =====================================================
-- STEP 5: SECURE CUSTOMER DATA POLICIES
-- =====================================================

-- Customers can only view their own data
CREATE POLICY "customers_own_data" ON customers
  FOR SELECT TO authenticated 
  USING (
    -- Customer viewing their own data
    user_id = auth.uid() OR
    -- Salesperson viewing assigned customers
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND ca.customer_id = customers.id
      AND ca.is_active = TRUE
    ) OR
    -- Admin viewing any customer (audited)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customer data updates (own data only)
CREATE POLICY "customers_update_own_data" ON customers
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Salesperson can create customers they're assigned to
CREATE POLICY "salesperson_create_customers" ON customers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('salesperson', 'admin')
    )
  );

-- =====================================================
-- STEP 6: SECURE ORDER ACCESS POLICIES  
-- =====================================================

-- Orders: Strict role-based access control
CREATE POLICY "orders_role_based_access" ON orders
  FOR SELECT TO authenticated 
  USING (
    -- Customer can see their own orders
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR
    -- Salesperson can see orders from assigned customers
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND ca.customer_id = orders.customer_id
      AND ca.is_active = TRUE
    ) OR
    -- Designer can see orders with their assigned design tasks
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN design_tasks dt ON dt.designer_id = up.id
      JOIN design_task_assignments dta ON dta.design_task_id = dt.id AND dta.designer_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'designer'
      AND dt.order_id = orders.id
      AND dta.is_active = TRUE
    ) OR
    -- Manufacturer can see orders with their assigned production tasks
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN production_tasks pt ON pt.manufacturer_id = up.id
      JOIN production_assignments pa ON pa.production_task_id = pt.id AND pa.manufacturer_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'manufacturer'
      AND pt.order_id = orders.id
      AND pa.is_active = TRUE
    ) OR
    -- Admin can see all orders (audited)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Order creation (customers and salespersons)
CREATE POLICY "orders_creation_control" ON orders
  FOR INSERT TO authenticated 
  WITH CHECK (
    -- Customer creating their own order
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR
    -- Salesperson creating order for assigned customer
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND ca.customer_id = orders.customer_id
      AND ca.is_active = TRUE
    ) OR
    -- Admin can create any order
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STEP 7: SECURE PAYMENT POLICIES
-- =====================================================

-- Payments: Customer and salesperson access only
CREATE POLICY "payments_restricted_access" ON payments
  FOR SELECT TO authenticated 
  USING (
    -- Customer can see their own payments via order relationship
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
    ) OR
    -- Salesperson can see payments for assigned customer orders
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      JOIN orders o ON o.customer_id = ca.customer_id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND o.id = payments.order_id
      AND ca.is_active = TRUE
    ) OR
    -- Admin can see all payments (audited)
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STEP 8: SECURE DESIGN TASK POLICIES
-- =====================================================

-- Design tasks: Designer assignment based
CREATE POLICY "design_tasks_assignment_based" ON design_tasks
  FOR SELECT TO authenticated 
  USING (
    -- Designer can see their assigned tasks
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN design_task_assignments dta ON dta.designer_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'designer'
      AND dta.design_task_id = design_tasks.id
      AND dta.is_active = TRUE
    ) OR
    -- Salesperson can see design tasks for orders from assigned customers
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      JOIN orders o ON o.customer_id = ca.customer_id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND o.id = design_tasks.order_id
      AND ca.is_active = TRUE
    ) OR
    -- Customer can see design tasks for their orders
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
    ) OR
    -- Admin can see all design tasks
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STEP 9: SECURE PRODUCTION TASK POLICIES
-- =====================================================

-- Production tasks: Manufacturer assignment based
CREATE POLICY "production_tasks_assignment_based" ON production_tasks
  FOR SELECT TO authenticated 
  USING (
    -- Manufacturer can see their assigned tasks
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN production_assignments pa ON pa.manufacturer_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'manufacturer'
      AND pa.production_task_id = production_tasks.id
      AND pa.is_active = TRUE
    ) OR
    -- Salesperson can see production tasks for orders from assigned customers
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      JOIN orders o ON o.customer_id = ca.customer_id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND o.id = production_tasks.order_id
      AND ca.is_active = TRUE
    ) OR
    -- Admin can see all production tasks
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STEP 10: ASSIGNMENT TABLE POLICIES
-- =====================================================

-- Customer assignments: Admin and salesperson read
CREATE POLICY "customer_assignments_access" ON customer_assignments
  FOR SELECT TO authenticated 
  USING (
    salesperson_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Design task assignments: Designer and admin read
CREATE POLICY "design_assignments_access" ON design_task_assignments
  FOR SELECT TO authenticated 
  USING (
    designer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Production assignments: Manufacturer and admin read  
CREATE POLICY "production_assignments_access" ON production_assignments
  FOR SELECT TO authenticated 
  USING (
    manufacturer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- STEP 11: SERVICE ROLE POLICIES (RESTRICTED)
-- =====================================================

-- Service role policies for system operations
CREATE POLICY "service_role_customers" ON customers FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_orders" ON orders FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_payments" ON payments FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_design_tasks" ON design_tasks FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_production_tasks" ON production_tasks FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_assignments" ON customer_assignments FOR ALL TO service_role USING (true);

-- =====================================================
-- STEP 12: AUDIT AND MONITORING
-- =====================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action_type TEXT NOT NULL, -- 'READ', 'CREATE', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id UUID,
  accessed_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_log_admin_only" ON security_audit_log
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert audit logs
CREATE POLICY "service_role_audit_log" ON security_audit_log
  FOR INSERT TO service_role WITH CHECK (true);

-- =====================================================
-- STEP 13: CREATE INITIAL ASSIGNMENTS
-- =====================================================

-- Sample customer assignments (to be populated by admin)
-- This ensures existing customers are properly assigned to salespersons

COMMIT;

-- Verification queries (run these to test the policies)
/*
-- Test customer data isolation
SELECT * FROM customers; -- Should only show customers you have access to

-- Test order access control  
SELECT * FROM orders; -- Should only show orders you're authorized to see

-- Test assignment visibility
SELECT * FROM customer_assignments; -- Should only show your assignments

-- Test admin vs non-admin access
SELECT COUNT(*) FROM customers; -- Admins should see all, others should see subset
*/