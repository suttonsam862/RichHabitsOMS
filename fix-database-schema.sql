
-- ===============================================
-- THREADCRAFT DATABASE SCHEMA FIX
-- Safe PostgreSQL syntax for all versions
-- ===============================================

-- Step 1: Create enums with proper syntax (drop and recreate if needed)
DO $$ BEGIN
    CREATE TYPE "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer', 'manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "message_status" AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create user_profiles table
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY,
  "username" TEXT UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" "role_type" NOT NULL DEFAULT 'customer',
  "phone" TEXT,
  "company" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 3: Create customers table
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

-- Step 4: Create catalog tables
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

-- Step 5: Create orders table
CREATE TABLE IF NOT EXISTS "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_number" TEXT NOT NULL UNIQUE,
  "customer_id" UUID NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "salesperson_id" UUID REFERENCES "user_profiles"("id"),
  "status" "order_status" NOT NULL DEFAULT 'draft',
  "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "stripe_session_id" TEXT,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 6: Create order_items table (fix the missing column issue)
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "catalog_item_id" UUID REFERENCES "catalog_items"("id") ON DELETE SET NULL,
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

-- Step 7: Create remaining tables
CREATE TABLE IF NOT EXISTS "design_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "designer_id" UUID REFERENCES "user_profiles"("id"),
  "status" "task_status" NOT NULL DEFAULT 'pending',
  "requirements" TEXT,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS "production_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "manufacturer_id" UUID REFERENCES "user_profiles"("id"),
  "status" "task_status" NOT NULL DEFAULT 'pending',
  "priority" VARCHAR(20) DEFAULT 'normal',
  "start_date" TIMESTAMP WITH TIME ZONE,
  "due_date" TIMESTAMP WITH TIME ZONE,
  "completed_date" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "production_requirements" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "receiver_id" UUID NOT NULL REFERENCES "user_profiles"("id"),
  "order_id" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "message_type" VARCHAR(50) DEFAULT 'general',
  "status" "message_status" DEFAULT 'sent',
  "read_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "email_sent" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}'::jsonb
);

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_catalog_item_id ON order_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
CREATE INDEX IF NOT EXISTS idx_design_tasks_order_id ON design_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);

-- Step 9: Insert default catalog data
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

-- Step 10: Create simple RLS policies (permissive for now)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow all operations for authenticated users
CREATE POLICY "allow_all_user_profiles" ON user_profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_customers" ON customers FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_catalog_items" ON catalog_items FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_order_items" ON order_items FOR ALL TO authenticated USING (true);

-- Success message
SELECT 'Database schema created successfully!' as status;
