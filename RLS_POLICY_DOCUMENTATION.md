# ThreadCraft Row Level Security (RLS) Policy Documentation

## Overview

This document outlines the expected Row Level Security (RLS) policies for the ThreadCraft custom clothing order management system. RLS policies ensure data access is restricted based on user roles and organizational boundaries, protecting sensitive customer, order, and business data.

## User Roles and Permissions Matrix

### Role Hierarchy
- **Admin**: Full system access, can view and modify all data
- **Salesperson**: Manages assigned customers and their orders
- **Designer**: Accesses design tasks and related order information
- **Manufacturer**: Accesses production tasks and manufacturing data
- **Customer**: Views only their own data and orders

## Required RLS Policies by Table

### 1. User Profiles (`user_profiles`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Users can view their own profile + Admin can view all profiles
- **UPDATE**: Users can update their own profile + Admin can update any profile
- **INSERT**: Only Admin can create new user profiles
- **DELETE**: Only Admin can delete user profiles

```sql
-- SELECT Policy
CREATE POLICY "users_select_own_or_admin" ON user_profiles FOR SELECT
USING (
  auth.uid() = id OR 
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- UPDATE Policy  
CREATE POLICY "users_update_own_or_admin" ON user_profiles FOR UPDATE
USING (
  auth.uid() = id OR 
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin'
);

-- INSERT Policy
CREATE POLICY "admin_insert_users" ON user_profiles FOR INSERT
WITH CHECK ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- DELETE Policy
CREATE POLICY "admin_delete_users" ON user_profiles FOR DELETE
USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');
```

### 2. Customers (`customers`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: 
  - Admin: View all customers
  - Salesperson: View assigned customers only
  - Designer/Manufacturer: View customers through assigned orders
  - Customer: View only their own record
- **INSERT**: Admin and Salesperson can create customers
- **UPDATE**: Admin and assigned Salesperson can update customers
- **DELETE**: Only Admin can delete customers

```sql
-- SELECT Policy
CREATE POLICY "customers_select_access" ON customers FOR SELECT
USING (
  -- Admin sees all
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Customer sees their own record
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND 
  user_id = auth.uid() OR
  
  -- Salesperson sees assigned customers (requires customer_assignments table)
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND
  id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid()) OR
  
  -- Designer sees customers through assigned design tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'designer' AND
  id IN (
    SELECT o.customer_id FROM orders o 
    JOIN design_tasks dt ON dt.order_id = o.id 
    WHERE dt.designer_id = auth.uid()
  ) OR
  
  -- Manufacturer sees customers through assigned production tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manufacturer' AND
  id IN (
    SELECT o.customer_id FROM orders o 
    JOIN production_tasks pt ON pt.order_id = o.id 
    WHERE pt.manufacturer_id = auth.uid()
  )
);

-- INSERT Policy
CREATE POLICY "customers_insert_access" ON customers FOR INSERT
WITH CHECK (
  (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'salesperson')
);

-- UPDATE Policy
CREATE POLICY "customers_update_access" ON customers FOR UPDATE
USING (
  -- Admin can update all
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Customer can update their own record
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND 
  user_id = auth.uid() OR
  
  -- Assigned salesperson can update
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND
  id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
);

-- DELETE Policy
CREATE POLICY "admin_delete_customers" ON customers FOR DELETE
USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');
```

### 3. Orders (`orders`) 
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: 
  - Admin: All orders
  - Salesperson: Orders for assigned customers
  - Designer: Orders with assigned design tasks
  - Manufacturer: Orders with assigned production tasks
  - Customer: Only their own orders
- **INSERT**: Admin, Salesperson, Customer can create orders
- **UPDATE**: Admin, assigned staff, customer (limited fields)
- **DELETE**: Only Admin can delete orders

```sql
-- SELECT Policy
CREATE POLICY "orders_select_access" ON orders FOR SELECT
USING (
  -- Admin sees all orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Customer sees own orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) OR
  
  -- Salesperson sees orders for assigned customers
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND (
    salesperson_id = auth.uid() OR
    customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
  ) OR
  
  -- Designer sees orders with assigned design tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'designer' AND (
    assigned_designer_id = auth.uid() OR
    id IN (SELECT order_id FROM design_tasks WHERE designer_id = auth.uid())
  ) OR
  
  -- Manufacturer sees orders with assigned production tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manufacturer' AND (
    assigned_manufacturer_id = auth.uid() OR
    id IN (SELECT order_id FROM production_tasks WHERE manufacturer_id = auth.uid())
  )
);

-- INSERT Policy  
CREATE POLICY "orders_insert_access" ON orders FOR INSERT
WITH CHECK (
  (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'salesperson') OR
  
  -- Customer can create orders for themselves
  ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND
   customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
);

-- UPDATE Policy
CREATE POLICY "orders_update_access" ON orders FOR UPDATE
USING (
  -- Admin can update all orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Assigned salesperson can update
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND (
    salesperson_id = auth.uid() OR
    customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
  ) OR
  
  -- Assigned designer can update design-related fields
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'designer' AND
  assigned_designer_id = auth.uid() OR
  
  -- Assigned manufacturer can update production-related fields
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manufacturer' AND
  assigned_manufacturer_id = auth.uid() OR
  
  -- Customer can update limited fields on their own orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()) AND
  status IN ('draft', 'pending_design')
);

-- DELETE Policy
CREATE POLICY "admin_delete_orders" ON orders FOR DELETE
USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');
```

### 4. Order Items (`order_items`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- Follow same access patterns as parent orders
- Additional restrictions for production-sensitive fields

```sql
-- SELECT Policy
CREATE POLICY "order_items_select_access" ON order_items FOR SELECT
USING (
  -- Access through parent order permissions
  order_id IN (
    SELECT id FROM orders WHERE 
    -- (Insert same logic as orders SELECT policy)
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
    ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND
     customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())) OR
    ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND (
      salesperson_id = auth.uid() OR
      customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
    )) OR
    ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'designer' AND (
      assigned_designer_id = auth.uid() OR
      id IN (SELECT order_id FROM design_tasks WHERE designer_id = auth.uid())
    )) OR
    ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manufacturer' AND (
      assigned_manufacturer_id = auth.uid() OR
      id IN (SELECT order_id FROM production_tasks WHERE manufacturer_id = auth.uid())
    ))
  )
);
```

### 5. Design Tasks (`design_tasks`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Admin, assigned designer, salesperson for customer's orders
- **INSERT**: Admin, Salesperson can create design tasks
- **UPDATE**: Admin, assigned designer can update
- **DELETE**: Only Admin can delete

```sql
-- SELECT Policy
CREATE POLICY "design_tasks_select_access" ON design_tasks FOR SELECT
USING (
  -- Admin sees all
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Assigned designer sees their tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'designer' AND
  designer_id = auth.uid() OR
  
  -- Salesperson sees tasks for their customers' orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND
  order_id IN (
    SELECT id FROM orders WHERE 
    salesperson_id = auth.uid() OR
    customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
  )
);
```

### 6. Production Tasks (`production_tasks`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Admin, assigned manufacturer, salesperson for customer's orders
- **INSERT**: Admin, Salesperson can create production tasks
- **UPDATE**: Admin, assigned manufacturer can update
- **DELETE**: Only Admin can delete

```sql
-- SELECT Policy
CREATE POLICY "production_tasks_select_access" ON production_tasks FOR SELECT
USING (
  -- Admin sees all
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Assigned manufacturer sees their tasks
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manufacturer' AND
  manufacturer_id = auth.uid() OR
  
  -- Salesperson sees tasks for their customers' orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND
  order_id IN (
    SELECT id FROM orders WHERE 
    salesperson_id = auth.uid() OR
    customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
  )
);
```

### 7. Messages (`messages`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Admin, sender, receiver
- **INSERT**: Authenticated users can send messages
- **UPDATE**: Only Admin can update messages
- **DELETE**: Admin and sender can delete

```sql
-- SELECT Policy
CREATE POLICY "messages_select_access" ON messages FOR SELECT
USING (
  -- Admin sees all messages
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Users see messages they sent or received
  sender_id = auth.uid() OR
  receiver_id = auth.uid()
);
```

### 8. Payments (`payments`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Admin, customer (own payments), salesperson (assigned customers)
- **INSERT**: Admin, Salesperson can create payments
- **UPDATE**: Admin only
- **DELETE**: Admin only

```sql
-- SELECT Policy
CREATE POLICY "payments_select_access" ON payments FOR SELECT
USING (
  -- Admin sees all payments
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Customer sees payments for their orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'customer' AND
  order_id IN (
    SELECT id FROM orders WHERE 
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  ) OR
  
  -- Salesperson sees payments for assigned customers' orders
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'salesperson' AND
  order_id IN (
    SELECT id FROM orders WHERE 
    salesperson_id = auth.uid() OR
    customer_id IN (SELECT customer_id FROM customer_assignments WHERE salesperson_id = auth.uid())
  )
);
```

### 9. Catalog Items (`catalog_items`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: All authenticated users can view active catalog items
- **INSERT**: Admin, Salesperson can add catalog items
- **UPDATE**: Admin, Salesperson can update catalog items
- **DELETE**: Only Admin can delete catalog items

```sql
-- SELECT Policy (Public read for active items)
CREATE POLICY "catalog_items_public_read" ON catalog_items FOR SELECT
USING (status = 'active' OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- INSERT Policy
CREATE POLICY "catalog_items_insert_access" ON catalog_items FOR INSERT
WITH CHECK ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'salesperson'));

-- UPDATE Policy
CREATE POLICY "catalog_items_update_access" ON catalog_items FOR UPDATE
USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('admin', 'salesperson'));

-- DELETE Policy
CREATE POLICY "admin_delete_catalog_items" ON catalog_items FOR DELETE
USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');
```

### 10. Activity Logs (`activity_logs`)
**Current Status**: ⚠️ TODO - RLS NOT IMPLEMENTED

**Required Policies**:
- **SELECT**: Admin can view all, users can view their own actions
- **INSERT**: System can insert (all authenticated users)
- **UPDATE**: No updates allowed
- **DELETE**: Only Admin can delete (for cleanup/privacy)

```sql
-- SELECT Policy
CREATE POLICY "activity_logs_select_access" ON activity_logs FOR SELECT
USING (
  -- Admin sees all logs
  (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' OR
  
  -- Users see their own activity logs
  user_id = auth.uid()
);
```

## Supporting Tables for Assignment-Based Access

### Customer Assignments (`customer_assignments`) 
**Current Status**: ⚠️ TODO - TABLE NOT IMPLEMENTED

This table is required to support salesperson-to-customer assignments for proper RLS enforcement.

```sql
CREATE TABLE customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salesperson_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(customer_id, salesperson_id)
);
```

### Design Task Assignments (`design_task_assignments`)
**Current Status**: ⚠️ TODO - TABLE NOT IMPLEMENTED

```sql
CREATE TABLE design_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_task_id UUID NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);
```

### Production Task Assignments (`production_task_assignments`)
**Current Status**: ⚠️ TODO - TABLE NOT IMPLEMENTED

```sql
CREATE TABLE production_task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_task_id UUID NOT NULL REFERENCES production_tasks(id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);
```

## Security Considerations

### 1. Performance Impact
- RLS policies add WHERE clauses to every query
- Consider indexing on user_id, role, and assignment tables
- Monitor query performance after implementation

### 2. Testing Requirements
- Create test users for each role
- Verify data isolation between roles
- Test assignment-based access patterns
- Ensure admin override works correctly

### 3. Audit Requirements
- Log all policy violations
- Monitor for suspicious access patterns
- Regular review of RLS policy effectiveness

## Implementation Priority

### Phase 1 (Critical): Core Data Protection
1. User Profiles RLS policies
2. Customers RLS policies  
3. Orders RLS policies
4. Customer Assignments table creation

### Phase 2 (High): Order Management
1. Order Items RLS policies
2. Design Tasks RLS policies
3. Production Tasks RLS policies
4. Assignment tables for tasks

### Phase 3 (Medium): Communication & Payments
1. Messages RLS policies
2. Payments RLS policies
3. Activity Logs RLS policies

### Phase 4 (Low): Catalog & Settings
1. Catalog Items RLS policies
2. User Settings RLS policies
3. Other supporting tables

## Current Security Gaps

⚠️ **CRITICAL SECURITY ISSUES**:

1. **No RLS policies implemented** - All tables are currently accessible by any authenticated user
2. **Assignment tables missing** - Cannot enforce salesperson-to-customer access restrictions
3. **Admin bypass not properly implemented** - Admin role checking may not work correctly
4. **Customer self-access incomplete** - Customers may not be able to access their own data properly

## Next Steps

1. Create assignment tables (`customer_assignments`, `design_task_assignments`, `production_task_assignments`)
2. Implement Phase 1 RLS policies for critical tables
3. Test with different user roles
4. Monitor performance and adjust indexes as needed
5. Implement remaining phases based on priority

---

**Note**: This documentation should be updated as RLS policies are implemented and tested. Regular security audits should verify that these policies are working as expected.