
# Row Level Security (RLS) Policy Map

## Overview
This document outlines the Row Level Security policies implemented across all ThreadCraft database tables, detailing access control patterns and role-based permissions.

## RLS Status by Table

### ✅ Core User Tables

#### `customers`
- **RLS Enabled**: ✅ Yes
- **Policies**: 3 policies implemented
  - `customers_own_data` (SELECT): Customers see own data, salespersons see assigned customers, admins see all
  - `customers_update_own_data` (UPDATE): Customers can only update their own records
  - `salesperson_create_customers` (INSERT): Salespersons and admins can create customers

#### `user_profiles`
- **RLS Enabled**: ✅ Yes  
- **Policies**: Role-based access with assignment tracking
- **Access Pattern**: Users see own profiles, admins see all with audit logging

#### `user_invitations`
- **RLS Enabled**: ✅ Yes
- **Policies**: Admin-only access for invitation management
- **Access Pattern**: Only admins can create, view, and manage invitations

### ✅ Order Management Tables

#### `orders`
- **RLS Enabled**: ✅ Yes
- **Policies**: Assignment-based access control
- **Access Pattern**: 
  - Customers: Own orders only
  - Salespersons: Assigned customer orders only
  - Designers: Orders with assigned design tasks
  - Admins: All orders (audited)

#### `order_items`
- **RLS Enabled**: ✅ Yes
- **Policies**: Follows parent order access patterns
- **Access Pattern**: Access controlled via order relationship

#### `payments`
- **RLS Enabled**: ✅ Yes
- **Policies**: Customer and salesperson restricted access
- **Access Pattern**: 
  - Customers: Own payments via order relationship
  - Salespersons: Payments for assigned customer orders
  - Admins: All payments (audited)

### ✅ Design & Production Tables

#### `design_tasks`
- **RLS Enabled**: ✅ Yes
- **Policies**: Assignment-based designer access
- **Access Pattern**:
  - Designers: Assigned tasks only via `design_task_assignments`
  - Salespersons: Tasks for assigned customer orders
  - Customers: Tasks for their orders
  - Admins: All tasks

#### `design_files`
- **RLS Enabled**: ✅ Yes
- **Policies**: Follows design task access patterns
- **Access Pattern**: Access controlled via design task relationship

#### `production_tasks`
- **RLS Enabled**: ✅ Yes
- **Policies**: Manufacturer assignment based
- **Access Pattern**:
  - Manufacturers: Assigned tasks only via `production_assignments`
  - Admins: All production tasks

### ✅ Catalog & Inventory Tables

#### `catalog_items`
- **RLS Enabled**: ✅ Yes
- **Policies**: Public read, admin write
- **Access Pattern**: All authenticated users can read, only admins can modify

#### `categories`
- **RLS Enabled**: ✅ Yes
- **Policies**: Public read, admin write
- **Access Pattern**: Read-only for all users, admin management

#### `sports`
- **RLS Enabled**: ✅ Yes
- **Policies**: Public read, admin write
- **Access Pattern**: Read-only for all users, admin management

#### `fabrics`
- **RLS Enabled**: ✅ Yes
- **Policies**: Public read, admin write
- **Access Pattern**: Read-only for all users, admin management

### ✅ Assignment & Access Control Tables

#### `customer_assignments`
- **RLS Enabled**: ✅ Yes
- **Policies**: Admin and assigned salesperson access
- **Access Pattern**: Controls which salespersons can access which customers

#### `design_task_assignments`
- **RLS Enabled**: ✅ Yes
- **Policies**: Admin and assigned designer access
- **Access Pattern**: Controls which designers can access which design tasks

#### `production_assignments`
- **RLS Enabled**: ✅ Yes
- **Policies**: Admin and assigned manufacturer access
- **Access Pattern**: Controls which manufacturers can access which production tasks

### ✅ Audit & Security Tables

#### `security_audit_log`
- **RLS Enabled**: ✅ Yes
- **Policies**: Admin-only access
- **Access Pattern**: Only system admins can view security events

#### `authentication_events`
- **RLS Enabled**: ✅ Yes
- **Policies**: User can see own events, admins see all
- **Access Pattern**: Users see their login history, admins monitor all events

## Security Patterns Implemented

### 1. Assignment-Based Access Control
- **Customer Assignments**: Links salespersons to specific customers
- **Design Task Assignments**: Controls designer access to tasks
- **Production Assignments**: Manages manufacturer access to production work

### 2. Hierarchical Role Permissions
```
Admin > Salesperson > Customer
Admin > Designer (task-specific)
Admin > Manufacturer (task-specific)
```

### 3. Data Isolation Guarantees
- ✅ Customers cannot see other customers' data
- ✅ Salespersons limited to assigned customers only
- ✅ Designers limited to assigned design tasks
- ✅ Manufacturers limited to assigned production tasks
- ✅ Cross-tenant data protection enforced

### 4. Audit Trail Requirements
- All admin operations logged in `security_audit_log`
- Permission denials tracked and monitored
- Authentication events recorded for security analysis

## Policy Implementation Examples

### Customer Data Protection
```sql
CREATE POLICY "customers_own_data" ON customers
  FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN customer_assignments ca ON ca.salesperson_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'salesperson'
      AND ca.customer_id = customers.id
      AND ca.is_active = TRUE
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### Design Task Assignment Control
```sql
CREATE POLICY "design_tasks_assignment_based" ON design_tasks
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN design_task_assignments dta ON dta.designer_id = up.id
      WHERE up.id = auth.uid() 
      AND up.role = 'designer'
      AND dta.design_task_id = design_tasks.id
      AND dta.is_active = TRUE
    ) OR
    -- Additional role-based access patterns...
  );
```

## Security Compliance Status

### ✅ ACHIEVED
- **Data Isolation**: Complete cross-tenant protection
- **Role-Based Access**: Proper permission hierarchy enforced
- **Assignment Control**: Task-based access restrictions
- **Audit Logging**: Comprehensive security event tracking
- **Production Ready**: All policies tested and verified

### 🔍 MONITORING POINTS
- Authentication failure rates
- Permission denial patterns  
- Role escalation attempts
- Unusual data access patterns

## Maintenance Notes

1. **Policy Updates**: All RLS policy changes must be tested in development first
2. **Performance Impact**: Monitor query performance with RLS enabled
3. **Access Validation**: Regular audits of user access patterns recommended
4. **Schema Changes**: New tables must include appropriate RLS policies before deployment

---
*Last Updated: July 30, 2025*
*Security Level: Production Grade*
