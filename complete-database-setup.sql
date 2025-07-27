
-- ===============================================
-- COMPLETE DATABASE SETUP FOR THREADCRAFT
-- Run this SQL in your Supabase SQL Editor
-- ===============================================

-- Step 1: Create all necessary enums
CREATE TYPE IF NOT EXISTS "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE IF NOT EXISTS "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE IF NOT EXISTS "message_status" AS ENUM ('sent', 'delivered', 'read');

-- Step 2: Create user_profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "username" TEXT UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" role_type NOT NULL DEFAULT 'customer',
  "phone" TEXT,
  "company" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 3: Create customers table (for Customer Page)
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
  "country" TEXT DEFAULT 'United States',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 4: Create catalog tables (for Catalog Page)
CREATE TABLE IF NOT EXISTS "catalog_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) UNIQUE NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "catalog_sports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) UNIQUE NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "catalog_fabrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) UNIQUE NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "catalog_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "sport" VARCHAR(100) NOT NULL DEFAULT 'All Around Item',
  "base_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "unit_cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "sku" VARCHAR(100) NOT NULL UNIQUE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  "base_image_url" TEXT,
  "measurement_chart_url" TEXT,
  "has_measurements" BOOLEAN DEFAULT FALSE,
  "measurement_instructions" TEXT,
  "eta_days" VARCHAR(10) NOT NULL DEFAULT '7',
  "preferred_manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "fabric_id" UUID REFERENCES "catalog_fabrics"("id"),
  "build_instructions" TEXT,
  "tags" JSONB DEFAULT '[]'::jsonb,
  "specifications" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create orders table (for Orders Page)
CREATE TABLE IF NOT EXISTS "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "salesperson_id" UUID REFERENCES "user_profiles"("id"),
  "status" order_status NOT NULL DEFAULT 'draft',
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  "payment_status" payment_status NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "stripe_session_id" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 6: Create order_items table (for Orders Page)
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "catalog_item_id" UUID REFERENCES "catalog_items"("id"),
  "product_name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  "total_price" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  "color" TEXT,
  "size" TEXT,
  "material" TEXT,
  "custom_specifications" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Create manufacturing tables (for Manufacturing Page)
CREATE TABLE IF NOT EXISTS "production_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "priority" VARCHAR(20) DEFAULT 'normal',
  "start_date" TIMESTAMP WITH TIME ZONE,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "completed_date" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "production_requirements" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "manufacturing_queue" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "production_task_id" UUID NOT NULL REFERENCES "production_tasks"("id") ON DELETE CASCADE,
  "queue_position" INTEGER,
  "estimated_start" TIMESTAMP WITH TIME ZONE,
  "estimated_completion" TIMESTAMP WITH TIME ZONE,
  "actual_start" TIMESTAMP WITH TIME ZONE,
  "actual_completion" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 8: Create design tables (for Design Dashboard)
CREATE TABLE IF NOT EXISTS "design_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "designer_id" UUID REFERENCES "user_profiles"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "requirements" TEXT,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "design_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "design_task_id" UUID NOT NULL REFERENCES "design_tasks"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "filename" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_size" INTEGER,
  "notes" TEXT,
  "version" INTEGER DEFAULT 1,
  "is_approved" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 9: Create messaging tables (for Messages)
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "receiver_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "order_id" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "message_type" VARCHAR(50) DEFAULT 'general',
  "status" message_status DEFAULT 'sent',
  "read_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "email_sent" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 10: Create payments tables (for Payment/Billing)
CREATE TABLE IF NOT EXISTS "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "status" payment_status NOT NULL DEFAULT 'pending',
  "payment_method" TEXT NOT NULL,
  "transaction_id" TEXT,
  "stripe_payment_intent_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 11: Create inventory table (for Inventory Management)
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "unit_price" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  "supplier" TEXT,
  "reorder_level" INTEGER DEFAULT 10,
  "last_ordered" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 12: Create customer invitations table (for Admin Customer Management)
CREATE TABLE IF NOT EXISTS "customer_invites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "first_name" VARCHAR(255) NOT NULL,
  "last_name" VARCHAR(255) NOT NULL,
  "company" VARCHAR(255),
  "phone" VARCHAR(50),
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "invited_by" UUID REFERENCES "user_profiles"("id"),
  "message" TEXT,
  "status" VARCHAR(50) DEFAULT 'pending',
  "used_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 13: Create activity logs (for Analytics/Monitoring)
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "user_profiles"("id"),
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID,
  "details" JSONB DEFAULT '{}'::jsonb,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 14: Create all necessary indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
CREATE INDEX IF NOT EXISTS idx_production_tasks_manufacturer_id ON production_tasks(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_design_tasks_designer_id ON design_tasks(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON design_tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Step 15: Enable Row Level Security (RLS) for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_fabrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Step 16: Create RLS policies for each table

-- User Profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Customers policies
CREATE POLICY "Allow authenticated users to read customers" ON customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

-- Catalog policies
CREATE POLICY "Allow authenticated users to read catalog categories" ON catalog_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read catalog sports" ON catalog_sports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read catalog fabrics" ON catalog_fabrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read catalog items" ON catalog_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage catalog" ON catalog_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage catalog sports" ON catalog_sports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage catalog fabrics" ON catalog_fabrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage catalog items" ON catalog_items
  FOR ALL USING (auth.role() = 'service_role');

-- Orders policies
CREATE POLICY "Allow authenticated users to read orders" ON orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Order items policies
CREATE POLICY "Allow authenticated users to read order items" ON order_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage order items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

-- Production tasks policies
CREATE POLICY "Allow authenticated users to read production tasks" ON production_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage production tasks" ON production_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- Design tasks policies
CREATE POLICY "Allow authenticated users to read design tasks" ON design_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage design tasks" ON design_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- Messages policies
CREATE POLICY "Allow authenticated users to read messages" ON messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Payments policies
CREATE POLICY "Allow authenticated users to read payments" ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to manage payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- Apply same pattern for remaining tables
CREATE POLICY "Allow service role to manage manufacturing queue" ON manufacturing_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage design files" ON design_files
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage inventory" ON inventory
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage customer invites" ON customer_invites
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage activity logs" ON activity_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Step 17: Insert default data for catalog options
INSERT INTO catalog_categories (name, is_active) VALUES
('T-Shirts', TRUE),
('Hoodies', TRUE),
('Polo Shirts', TRUE),
('Jackets', TRUE),
('Pants', TRUE),
('Shorts', TRUE),
('Accessories', TRUE),
('Custom', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO catalog_sports (name, is_active) VALUES
('All Around Item', TRUE),
('Basketball', TRUE),
('Football', TRUE),
('Soccer', TRUE),
('Baseball', TRUE),
('Tennis', TRUE),
('Golf', TRUE),
('Swimming', TRUE),
('Running', TRUE),
('Cycling', TRUE),
('Volleyball', TRUE),
('Hockey', TRUE),
('Wrestling', TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO catalog_fabrics (name, description) VALUES 
('Cotton', 'Natural fiber from cotton plants, breathable and comfortable'),
('Polyester', 'Synthetic fiber, durable and wrinkle-resistant'),
('Silk', 'Luxurious natural fiber with smooth texture and natural sheen'),
('Linen', 'Natural fiber from flax plants, lightweight and cool'),
('Wool', 'Natural fiber from sheep, warm and insulating'),
('Bamboo', 'Eco-friendly fiber made from bamboo plants, naturally antibacterial'),
('Hemp', 'Durable natural fiber, environmentally sustainable'),
('Modal', 'Semi-synthetic fiber made from beech trees, soft and breathable'),
('Spandex', 'Synthetic elastic fiber, provides stretch and recovery'),
('Nylon', 'Strong synthetic fiber, lightweight and quick-drying')
ON CONFLICT (name) DO NOTHING;

-- Step 18: Create functions for statistics and aggregations
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(status text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT o.status::text, COUNT(*) as count
  FROM orders o
  GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_customer_count()
RETURNS bigint AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM customers);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_catalog_item_count()
RETURNS bigint AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM catalog_items WHERE status = 'active');
END;
$$ LANGUAGE plpgsql;

-- Step 19: Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_production_tasks_updated_at BEFORE UPDATE ON production_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_design_tasks_updated_at BEFORE UPDATE ON design_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- SETUP COMPLETE
-- ===============================================
