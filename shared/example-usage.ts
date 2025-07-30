/**
 * EXAMPLE USAGE OF SHARED SUPABASE TYPES
 * This file demonstrates how to use the comprehensive types from /shared/types.ts
 */

import { 
  Database, 
  Customer, 
  CustomerInsert, 
  CustomerUpdate,
  Order,
  OrderWithDetails,
  CatalogItem,
  UserProfile,
  ApiResponse,
  PaginatedResponse,
  RoleType,
  OrderStatus
} from './types';

// =====================================
// EXAMPLE 1: DATABASE CLIENT TYPING
// =====================================

// When creating Supabase client, use the Database type
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// =====================================
// EXAMPLE 2: API FUNCTIONS WITH TYPES
// =====================================

// Customer operations with full type safety
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createCustomer(customer: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================
// EXAMPLE 3: COMPLEX QUERIES WITH JOINS
// =====================================

export async function getOrderWithDetails(orderId: string): Promise<OrderWithDetails | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      salesperson:user_profiles!orders_salesperson_id_fkey(*),
      designer:user_profiles!orders_assigned_designer_id_fkey(*),
      manufacturer:user_profiles!orders_assigned_manufacturer_id_fkey(*),
      items:order_items(*),
      design_tasks(*),
      production_tasks(*),
      payments(*)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

// =====================================
// EXAMPLE 4: API RESPONSE FORMATTING
// =====================================

export function formatApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export function formatPaginatedResponse<T>(
  items: T[], 
  count: number, 
  page: number = 1, 
  limit: number = 100
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items,
      count,
      page,
      limit,
      total_pages: Math.ceil(count / limit)
    }
  };
}

// =====================================
// EXAMPLE 5: FORM HANDLING WITH TYPES
// =====================================

export interface CustomerFormData extends Omit<CustomerInsert, 'id' | 'created_at'> {
  // Add any additional form-specific fields
  confirmEmail?: string;
}

export function validateCustomerForm(formData: CustomerFormData): {
  valid: boolean;
  errors: Array<{ field: keyof CustomerFormData; message: string }>;
} {
  const errors: Array<{ field: keyof CustomerFormData; message: string }> = [];
  
  if (!formData.first_name) {
    errors.push({ field: 'first_name', message: 'First name is required' });
  }
  
  if (!formData.last_name) {
    errors.push({ field: 'last_name', message: 'Last name is required' });
  }
  
  if (!formData.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =====================================
// EXAMPLE 6: ROLE-BASED ACCESS CONTROL
// =====================================

export function hasPermission(userRole: RoleType, requiredRole: RoleType): boolean {
  const roleHierarchy: Record<RoleType, number> = {
    customer: 0,
    manufacturer: 1,
    designer: 2,
    salesperson: 3,
    admin: 4
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canEditOrder(userRole: RoleType, orderStatus: OrderStatus): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'salesperson' && orderStatus === 'draft') return true;
  if (userRole === 'designer' && orderStatus === 'design_in_progress') return true;
  if (userRole === 'manufacturer' && orderStatus === 'in_production') return true;
  
  return false;
}

// =====================================
// EXAMPLE 7: TYPE GUARDS
// =====================================

export function isOrder(obj: any): obj is Order {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.order_number === 'string' &&
    typeof obj.customer_id === 'string';
}

export function isCustomer(obj: any): obj is Customer {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.first_name === 'string' &&
    typeof obj.last_name === 'string' &&
    typeof obj.email === 'string';
}

// =====================================
// EXAMPLE 8: UTILITY FUNCTIONS
// =====================================

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    draft: '#6b7280',
    pending_design: '#f59e0b',
    design_in_progress: '#3b82f6',
    design_review: '#8b5cf6',
    design_approved: '#10b981',
    pending_production: '#f59e0b',
    in_production: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444'
  };
  
  return colors[status];
}

export function formatUserDisplayName(user: UserProfile): string {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user.username;
}

export function calculateOrderTotal(items: Array<{ quantity: number; unit_price: number }>): number {
  return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
}