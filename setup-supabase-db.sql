-- This SQL script creates all necessary tables for the custom clothing order management system
-- Run this in the Supabase SQL Editor to initialize your database

-- Create enums
CREATE TYPE "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE "message_status" AS ENUM ('sent', 'delivered', 'read');

-- Create user profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT NOT NULL UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" role_type NOT NULL DEFAULT 'customer',
  "phone" TEXT,
  "company" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" TEXT
);

-- Create RLS policies for user_profiles
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;

-- Allow inserts for everyone (needed for initial setup)
CREATE POLICY "Anyone can insert user profiles"
  ON "user_profiles" FOR INSERT
  WITH CHECK (true);

-- Allow service role to do anything
CREATE POLICY "Service role can manage all profiles"
  ON "user_profiles" FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view/update their own profile
CREATE POLICY "Users can view their own profile"
  ON "user_profiles" FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON "user_profiles" FOR UPDATE
  USING (auth.uid() = id);

-- Create customers table
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
  "country" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "salesperson_id" UUID REFERENCES "user_profiles"("id"),
  "status" order_status NOT NULL DEFAULT 'draft',
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "tax" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "is_paid" BOOLEAN NOT NULL DEFAULT false,
  "stripe_session_id" TEXT,
  "payment_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create order items table
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "product_name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" NUMERIC NOT NULL DEFAULT 1,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "total_price" NUMERIC(10,2) NOT NULL,
  "color" TEXT,
  "size" TEXT
);

-- Create design tasks table
CREATE TABLE IF NOT EXISTS "design_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "designer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "description" TEXT,
  "notes" TEXT,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create design files table
CREATE TABLE IF NOT EXISTS "design_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "design_task_id" UUID NOT NULL REFERENCES "design_tasks"("id") ON DELETE CASCADE,
  "uploaded_by" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "filename" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create production tasks table
CREATE TABLE IF NOT EXISTS "production_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "description" TEXT,
  "notes" TEXT,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "receiver_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "status" message_status NOT NULL DEFAULT 'sent',
  "order_id" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
  "design_task_id" UUID REFERENCES "design_tasks"("id"),
  "production_task_id" UUID REFERENCES "production_tasks"("id"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP WITH TIME ZONE,
  "email_sent" BOOLEAN DEFAULT false
);

-- Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "status" payment_status NOT NULL DEFAULT 'pending',
  "method" TEXT,
  "transaction_id" TEXT,
  "notes" TEXT,
  "stripe_payment_id" TEXT,
  "stripe_client_secret" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "size" TEXT,
  "color" TEXT,
  "quantity" NUMERIC NOT NULL DEFAULT 0,
  "min_quantity" NUMERIC DEFAULT 10,
  "notes" TEXT,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "user_profiles"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID,
  "details" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "email_notifications" BOOLEAN DEFAULT true,
  "theme" TEXT DEFAULT 'light',
  "preferences" JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_salesperson_id ON orders(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_order_id ON design_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_designer_id ON design_tasks(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON design_tasks(status);
CREATE INDEX IF NOT EXISTS idx_design_files_design_task_id ON design_files(design_task_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_manufacturer_id ON production_tasks(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);