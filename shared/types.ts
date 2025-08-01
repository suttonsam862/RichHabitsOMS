/**
 * SHARED SUPABASE TYPES
 * Comprehensive type definitions for ThreadCraft database schema
 * Used by both client and server for type safety
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================
// ENUMS
// =====================================

export type RoleType = 'admin' | 'salesperson' | 'designer' | 'manufacturer' | 'customer';

export type OrderStatus = 
  | 'draft' 
  | 'pending_design' 
  | 'design_in_progress' 
  | 'design_review' 
  | 'design_approved' 
  | 'pending_production' 
  | 'in_production' 
  | 'completed' 
  | 'cancelled';

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'refunded';

export type MessageStatus = 
  | 'sent' 
  | 'delivered' 
  | 'read';

export type OrganizationType = 
  | 'sports' 
  | 'business' 
  | 'education' 
  | 'nonprofit' 
  | 'government';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

// =====================================
// SALESPERSON TYPES
// =====================================

export interface Salesperson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  commissionRate?: number;
  territory?: string[];
  status: 'active' | 'inactive' | 'suspended';
  profileImageUrl?: string;
  payrollFiles?: string[];
  createdAt: string;
  updatedAt: string;
}

// =====================================
// DATABASE TYPES
// =====================================

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string
          first_name: string | null
          last_name: string | null
          role: RoleType
          phone: string | null
          company: string | null
          created_at: string
          stripe_customer_id: string | null
          capabilities: Json
        }
        Insert: {
          id: string
          username: string
          first_name?: string | null
          last_name?: string | null
          role?: RoleType
          phone?: string | null
          company?: string | null
          created_at?: string
          stripe_customer_id?: string | null
          capabilities?: Json
        }
        Update: {
          id?: string
          username?: string
          first_name?: string | null
          last_name?: string | null
          role?: RoleType
          phone?: string | null
          company?: string | null
          created_at?: string
          stripe_customer_id?: string | null
          capabilities?: Json
        }
      }
      customers: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          company: string | null
          sport: string | null
          organization_type: OrganizationType
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          country: string | null
          created_at: string
          status: 'active' | 'inactive'
          profile_image_url: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          company?: string | null
          sport?: string | null
          organization_type?: OrganizationType
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          created_at?: string
          status?: 'active' | 'inactive'
          profile_image_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          company?: string | null
          sport?: string | null
          organization_type?: OrganizationType
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          country?: string | null
          created_at?: string
          status?: 'active' | 'inactive'
          profile_image_url?: string | null
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          salesperson_id: string | null
          assigned_designer_id: string | null
          assigned_manufacturer_id: string | null
          status: OrderStatus
          priority: PriorityLevel
          rush_order: boolean
          total_amount: number
          discount: number
          notes: string | null
          internal_notes: string | null
          customer_requirements: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          estimated_delivery_date: string | null
          actual_delivery_date: string | null
          created_at: string
          updated_at: string
          production_images: Json
          image_variants: Json
        }
        Insert: {
          id?: string
          order_number: string
          customer_id: string
          salesperson_id?: string | null
          assigned_designer_id?: string | null
          assigned_manufacturer_id?: string | null
          status?: OrderStatus
          priority?: PriorityLevel
          rush_order?: boolean
          total_amount?: number
          discount?: number
          notes?: string | null
          internal_notes?: string | null
          customer_requirements?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          actual_delivery_date?: string | null
          created_at?: string
          updated_at?: string
          production_images?: Json
          image_variants?: Json
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          salesperson_id?: string | null
          assigned_designer_id?: string | null
          assigned_manufacturer_id?: string | null
          status?: OrderStatus
          priority?: PriorityLevel
          rush_order?: boolean
          total_amount?: number
          discount?: number
          notes?: string | null
          internal_notes?: string | null
          customer_requirements?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          estimated_delivery_date?: string | null
          actual_delivery_date?: string | null
          created_at?: string
          updated_at?: string
          production_images?: Json
          image_variants?: Json
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          catalog_item_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          size: string | null
          color: string | null
          fabric: string | null
          customization: string | null
          specifications: string | null
          design_file_url: string | null
          production_notes: string | null
          status: TaskStatus
          estimated_completion_date: string | null
          actual_completion_date: string | null
        }
        Insert: {
          id?: string
          order_id: string
          catalog_item_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          size?: string | null
          color?: string | null
          fabric?: string | null
          customization?: string | null
          specifications?: string | null
          design_file_url?: string | null
          production_notes?: string | null
          status?: TaskStatus
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          catalog_item_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          size?: string | null
          color?: string | null
          fabric?: string | null
          customization?: string | null
          specifications?: string | null
          design_file_url?: string | null
          production_notes?: string | null
          status?: TaskStatus
          estimated_completion_date?: string | null
          actual_completion_date?: string | null
        }
      }
      catalog_items: {
        Row: {
          id: string
          name: string
          description: string | null
          sku: string
          base_price: number
          unit_cost: number | null
          category: string
          sport: string | null
          fabric: string | null
          status: 'active' | 'inactive' | 'discontinued'
          eta_days: number | null
          preferred_manufacturer_id: string | null
          specifications: Json
          image_variants: Json
          build_instructions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sku: string
          base_price: number
          unit_cost?: number | null
          category: string
          sport?: string | null
          fabric?: string | null
          status?: 'active' | 'inactive' | 'discontinued'
          eta_days?: number | null
          preferred_manufacturer_id?: string | null
          specifications?: Json
          image_variants?: Json
          build_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sku?: string
          base_price?: number
          unit_cost?: number | null
          category?: string
          sport?: string | null
          fabric?: string | null
          status?: 'active' | 'inactive' | 'discontinued'
          eta_days?: number | null
          preferred_manufacturer_id?: string | null
          specifications?: Json
          image_variants?: Json
          build_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      catalog_categories: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      catalog_sports: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
      }
      catalog_fabrics: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      design_tasks: {
        Row: {
          id: string
          order_id: string
          designer_id: string | null
          status: TaskStatus
          requirements: string | null
          due_date: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          design_files: Json
        }
        Insert: {
          id?: string
          order_id: string
          designer_id?: string | null
          status?: TaskStatus
          requirements?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          design_files?: Json
        }
        Update: {
          id?: string
          order_id?: string
          designer_id?: string | null
          status?: TaskStatus
          requirements?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          design_files?: Json
        }
      }
      production_tasks: {
        Row: {
          id: string
          order_id: string
          manufacturer_id: string | null
          status: TaskStatus
          requirements: string | null
          due_date: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          progress_images: Json
        }
        Insert: {
          id?: string
          order_id: string
          manufacturer_id?: string | null
          status?: TaskStatus
          requirements?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          progress_images?: Json
        }
        Update: {
          id?: string
          order_id?: string
          manufacturer_id?: string | null
          status?: TaskStatus
          requirements?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          progress_images?: Json
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string | null
          order_id: string | null
          subject: string | null
          body: string
          status: MessageStatus
          priority: PriorityLevel
          created_at: string
          read_at: string | null
          email_sent: boolean
          attachments: Json
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id?: string | null
          order_id?: string | null
          subject?: string | null
          body: string
          status?: MessageStatus
          priority?: PriorityLevel
          created_at?: string
          read_at?: string | null
          email_sent?: boolean
          attachments?: Json
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string | null
          order_id?: string | null
          subject?: string | null
          body?: string
          status?: MessageStatus
          priority?: PriorityLevel
          created_at?: string
          read_at?: string | null
          email_sent?: boolean
          attachments?: Json
        }
      }
      payments: {
        Row: {
          id: string
          order_id: string
          customer_id: string
          amount: number
          currency: string
          status: PaymentStatus
          stripe_payment_intent_id: string | null
          stripe_charge_id: string | null
          payment_method: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          order_id: string
          customer_id: string
          amount: number
          currency?: string
          status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          order_id?: string
          customer_id?: string
          amount?: number
          currency?: string
          status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          stripe_charge_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
      }
      image_assets: {
        Row: {
          id: string
          uploaded_by: string
          entity_type: string
          entity_id: string
          image_purpose: string
          storage_path: string
          url: string
          filename: string
          file_size: number
          mime_type: string
          alt_text: string | null
          is_primary: boolean
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          uploaded_by: string
          entity_type: string
          entity_id: string
          image_purpose: string
          storage_path: string
          url: string
          filename: string
          file_size: number
          mime_type: string
          alt_text?: string | null
          is_primary?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          uploaded_by?: string
          entity_type?: string
          entity_id?: string
          image_purpose?: string
          storage_path?: string
          url?: string
          filename?: string
          file_size?: number
          mime_type?: string
          alt_text?: string | null
          is_primary?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          theme: string
          preferences: Json
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          theme?: string
          preferences?: Json
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          theme?: string
          preferences?: Json
        }
      }
      order_audit_log: {
        Row: {
          id: string
          order_id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          description: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          description?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          description?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role_type: RoleType
      order_status: OrderStatus
      task_status: TaskStatus
      payment_status: PaymentStatus
      message_status: MessageStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =====================================
// UTILITY TYPES
// =====================================

// Row types for easy access
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type CatalogItem = Database['public']['Tables']['catalog_items']['Row'];
export type CatalogCategory = Database['public']['Tables']['catalog_categories']['Row'];
export type CatalogSport = Database['public']['Tables']['catalog_sports']['Row'];
export type CatalogFabric = Database['public']['Tables']['catalog_fabrics']['Row'];
export type DesignTask = Database['public']['Tables']['design_tasks']['Row'];
export type ProductionTask = Database['public']['Tables']['production_tasks']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type ImageAsset = Database['public']['Tables']['image_assets']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type OrderAuditLog = Database['public']['Tables']['order_audit_log']['Row'];

// Insert types for easy access
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
export type CatalogItemInsert = Database['public']['Tables']['catalog_items']['Insert'];
export type CatalogCategoryInsert = Database['public']['Tables']['catalog_categories']['Insert'];
export type CatalogSportInsert = Database['public']['Tables']['catalog_sports']['Insert'];
export type CatalogFabricInsert = Database['public']['Tables']['catalog_fabrics']['Insert'];
export type DesignTaskInsert = Database['public']['Tables']['design_tasks']['Insert'];
export type ProductionTaskInsert = Database['public']['Tables']['production_tasks']['Insert'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type ImageAssetInsert = Database['public']['Tables']['image_assets']['Insert'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];
export type OrderAuditLogInsert = Database['public']['Tables']['order_audit_log']['Insert'];

// Update types for easy access
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
export type OrderItemUpdate = Database['public']['Tables']['order_items']['Update'];
export type CatalogItemUpdate = Database['public']['Tables']['catalog_items']['Update'];
export type CatalogCategoryUpdate = Database['public']['Tables']['catalog_categories']['Update'];
export type CatalogSportUpdate = Database['public']['Tables']['catalog_sports']['Update'];
export type CatalogFabricUpdate = Database['public']['Tables']['catalog_fabrics']['Update'];
export type DesignTaskUpdate = Database['public']['Tables']['design_tasks']['Update'];
export type ProductionTaskUpdate = Database['public']['Tables']['production_tasks']['Update'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];
export type ImageAssetUpdate = Database['public']['Tables']['image_assets']['Update'];
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];
export type OrderAuditLogUpdate = Database['public']['Tables']['order_audit_log']['Update'];

// =====================================
// COMPOSITE TYPES FOR COMPLEX OPERATIONS
// =====================================

// Order with related data
export interface OrderWithDetails extends Order {
  customer?: Customer;
  salesperson?: UserProfile;
  designer?: UserProfile;
  manufacturer?: UserProfile;
  items?: OrderItem[];
  design_tasks?: DesignTask[];
  production_tasks?: ProductionTask[];
  payments?: Payment[];
  audit_logs?: OrderAuditLog[];
}

// Customer with orders
export interface CustomerWithOrders extends Customer {
  orders?: Order[];
  user_profile?: UserProfile;
}

// Catalog item with category and sport info
export interface CatalogItemWithDetails extends CatalogItem {
  category_info?: CatalogCategory;
  sport_info?: CatalogSport;
  fabric_info?: CatalogFabric;
  manufacturer?: UserProfile;
}

// User profile with role-specific data
export interface UserProfileWithDetails extends UserProfile {
  assigned_orders?: Order[];
  design_tasks?: DesignTask[];
  production_tasks?: ProductionTask[];
  customer_info?: Customer;
}

// Task with order and assignee info
export interface TaskWithDetails extends DesignTask {
  order?: Order;
  designer?: UserProfile;
  customer?: Customer;
}

export interface ProductionTaskWithDetails extends ProductionTask {
  order?: Order;
  manufacturer?: UserProfile;
  customer?: Customer;
}

// =====================================
// API RESPONSE TYPES
// =====================================

// export interface ApiResponse<T = any> {
//   success: boolean;
//   data?: T;
//   message?: string;
//   error?: string;
// }

// export interface PaginatedResponse<T = any> {
//   success: boolean;
//   data: {
//     items: T[];
//     count: number;
//     page?: number;
//     limit?: number;
//     total_pages?: number;
//   };
//   message?: string;
// }

// =====================================
// IMAGE AND FILE TYPES
// =====================================

export interface ImageVariant {
  id: string;
  url: string;
  filename: string;
  alt_text?: string;
  is_primary?: boolean;
  size?: number;
  width?: number;
  height?: number;
  created_at?: string;
}

export interface ProductionImage {
  id: string;
  url: string;
  filename: string;
  size?: number;
  caption?: string;
  stage?: string;
  task_type?: string;
  task_id?: string;
  uploaded_at?: string;
}

export interface DesignFile {
  id: string;
  url: string;
  filename: string;
  file_type?: string;
  notes?: string;
  version?: number;
  is_final?: boolean;
  uploaded_at?: string;
}

// =====================================
// FORM AND VALIDATION TYPES
// =====================================

export interface FormError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: FormError[];
}

// =====================================
// DASHBOARD AND ANALYTICS TYPES
// =====================================

export interface DashboardStats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_customers: number;
  total_revenue: number;
  pending_designs: number;
  in_production: number;
  overdue_tasks: number;
}

export interface ManufacturingStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  avg_completion_time: number;
  capacity_utilization: number;
}

// =====================================
// SEARCH AND FILTER TYPES
// =====================================

export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

// =====================================
// NOTIFICATION TYPES
// =====================================

export interface NotificationPreferences {
  email_notifications: boolean;
  order_updates: boolean;
  task_assignments: boolean;
  payment_updates: boolean;
  system_alerts: boolean;
}

// =====================================
// EXPORT ALL TYPES
// =====================================

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Core User Types
export interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
}

// TODO: flesh out Salesperson fields
export interface Salesperson {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  commission_rate: number;
  profile_image_url?: string;
  payroll_file_url?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// TODO: Salesperson assignment data
export interface SalespersonAssignment {
  id: string;
  salesperson_id: string;
  customer_id: string;
  assigned_at: string;
  territory?: string;
}

export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  profileImageUrl?: string;
  companyLogoUrl?: string;
  createdAt: string;
  updatedAt: string;
  // TODO: allow assigning salespeople to customers
  salesperson_id?: string;
  salesperson?: Salesperson;
}

// Order Types
export interface OrderItem {
  id: string;
  orderId: string;
  productName: string;
  description?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  tax?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderItems?: OrderItem[];
  customer?: Customer;
}

// export type OrderStatus = 'draft' | 'pending' | 'approved' | 'in_production' | 'completed' | 'cancelled';

// Catalog Types
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sport: string;
  sku: string;
  basePrice: number;
  unitCost: number;
  status: CatalogItemStatus;
  baseImageUrl?: string;
  measurementChartUrl?: string;
  hasMeasurements: boolean;
  measurementInstructions?: string;
  etaDays: string;
  preferredManufacturerId?: string;
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type CatalogItemStatus = 'active' | 'inactive' | 'discontinued';

// Form Types
export interface FormErrors {
  [key: string]: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: FormErrors;
  timestamp?: string;
}

// Dashboard Types
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}