-- Create enums
CREATE TYPE "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE "message_status" AS ENUM ('sent', 'delivered', 'read');

-- Create user profiles table linked to Supabase Auth
CREATE TABLE "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT NOT NULL UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" role_type NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" TEXT
);

-- Create RLS policies for user_profiles
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON "user_profiles" FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin users can view all profiles"
  ON "user_profiles" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON "user_profiles" FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON "user_profiles" FOR ALL
  USING (auth.role() = 'service_role');

-- Create customers table
CREATE TABLE "customers" (
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
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

-- Create orders table
CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "salesperson_id" UUID REFERENCES "user_profiles"("id"),
  "status" order_status NOT NULL DEFAULT 'draft',
  "total_amount" NUMERIC(10,2) NOT NULL,
  "payment_status" payment_status NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "stripe_session_id" TEXT,
  "metadata" JSONB
);

-- Create order items table
CREATE TABLE "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "color" TEXT,
  "size" TEXT,
  "material" TEXT,
  "metadata" JSONB
);

-- Create design tasks table
CREATE TABLE "design_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "designer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "requirements" TEXT,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB
);

-- Create design files table
CREATE TABLE "design_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "design_task_id" UUID NOT NULL REFERENCES "design_tasks"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "filename" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

-- Create production tasks table
CREATE TABLE "production_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "start_date" TIMESTAMP WITH TIME ZONE,
  "end_date" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB
);

-- Create messages table
CREATE TABLE "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "receiver_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "order_id" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "read_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "email_sent" BOOLEAN DEFAULT false,
  "metadata" JSONB
);

-- Create payments table
CREATE TABLE "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "status" payment_status NOT NULL DEFAULT 'pending',
  "payment_method" TEXT NOT NULL,
  "transaction_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

-- Create inventory table
CREATE TABLE "inventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "category" TEXT,
  "supplier" TEXT,
  "reorder_level" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

-- Create activity logs table
CREATE TABLE "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "user_agent" TEXT
);

-- Create user settings table
CREATE TABLE "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_salesperson_id ON orders(salesperson_id);
CREATE INDEX idx_orders_manufacturer_id ON orders(manufacturer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_design_tasks_order_id ON design_tasks(order_id);
CREATE INDEX idx_design_tasks_designer_id ON design_tasks(designer_id);
CREATE INDEX idx_design_tasks_status ON design_tasks(status);
CREATE INDEX idx_design_files_design_task_id ON design_files(design_task_id);
CREATE INDEX idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX idx_production_tasks_manufacturer_id ON production_tasks(manufacturer_id);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type_entity_id ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Create functions for order statistics
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(status text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT o.status::text, COUNT(*) as count
  FROM orders o
  GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;