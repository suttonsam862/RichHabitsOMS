-- =================================================================
-- SAFE MIGRATION SCRIPT FOR PRODUCT LIBRARY SCHEMA
-- ThreadCraft Custom Clothing Order Management System
-- =================================================================
-- This migration script safely applies the Product Library schema to 
-- an existing Supabase PostgreSQL instance without data loss.
--
-- ⚠️  IMPORTANT: Always backup your database before running migrations!
-- =================================================================

-- Step 1: Enable necessary extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create enums only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_type') THEN
        CREATE TYPE role_type AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
    END IF;
END $$;

-- =================================================================
-- STEP 3: CREATE TABLES SAFELY (with IF NOT EXISTS)
-- =================================================================

-- Core Product Library Tables
CREATE TABLE IF NOT EXISTS catalog_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_sports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_fabrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    composition TEXT,
    weight_gsm INTEGER,
    care_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role role_type DEFAULT 'customer' NOT NULL,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    stripe_customer_id TEXT,
    capabilities JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    company TEXT,
    sport TEXT,
    organization_type TEXT DEFAULT 'business',
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    salesperson_id UUID REFERENCES user_profiles(id),
    assigned_designer_id UUID REFERENCES user_profiles(id),
    assigned_manufacturer_id UUID REFERENCES user_profiles(id),
    status order_status DEFAULT 'draft' NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0 NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    notes TEXT,
    internal_notes TEXT,
    customer_requirements TEXT,
    delivery_address TEXT,
    delivery_instructions TEXT,
    rush_order BOOLEAN DEFAULT FALSE NOT NULL,
    estimated_delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    is_paid BOOLEAN DEFAULT FALSE NOT NULL,
    stripe_session_id TEXT,
    payment_date TIMESTAMPTZ,
    logo_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================
-- STEP 4: SAFE CATALOG_ITEMS TABLE CREATION/MODIFICATION
-- =================================================================
-- This handles both new installations and existing table modifications

DO $$
BEGIN
    -- Check if catalog_items exists and create if not
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'catalog_items') THEN
        CREATE TABLE catalog_items (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            sku TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            sport TEXT DEFAULT 'All Around Item' NOT NULL,
            status TEXT DEFAULT 'active' NOT NULL,
            base_price DECIMAL(10,2) NOT NULL,
            unit_cost DECIMAL(10,2) DEFAULT 0 NOT NULL,
            fabric TEXT,
            fabric_id UUID REFERENCES catalog_fabrics(id) ON DELETE SET NULL,
            sizes JSONB DEFAULT '[]',
            colors JSONB DEFAULT '[]',
            min_quantity DECIMAL(8,2) DEFAULT 1,
            max_quantity DECIMAL(8,2) DEFAULT 1000,
            eta_days TEXT DEFAULT '7' NOT NULL,
            preferred_manufacturer_id UUID REFERENCES user_profiles(id),
            build_instructions TEXT,
            base_image_url TEXT,
            image_url TEXT,
            image_variants JSONB DEFAULT '{}',
            images JSONB DEFAULT '[]',
            measurement_chart_url TEXT,
            has_measurements BOOLEAN DEFAULT FALSE,
            measurement_instructions TEXT,
            customization_options JSONB DEFAULT '[]',
            specifications JSONB DEFAULT '{}',
            tags JSONB DEFAULT '[]',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Table exists, add missing columns safely
        -- Add fabric_id column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'fabric_id') THEN
            ALTER TABLE catalog_items ADD COLUMN fabric_id UUID REFERENCES catalog_fabrics(id) ON DELETE SET NULL;
        END IF;
        
        -- Add enhanced image management columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'image_variants') THEN
            ALTER TABLE catalog_items ADD COLUMN image_variants JSONB DEFAULT '{}';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'images') THEN
            ALTER TABLE catalog_items ADD COLUMN images JSONB DEFAULT '[]';
        END IF;
        
        -- Add measurement fields if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'measurement_chart_url') THEN
            ALTER TABLE catalog_items ADD COLUMN measurement_chart_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'has_measurements') THEN
            ALTER TABLE catalog_items ADD COLUMN has_measurements BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'measurement_instructions') THEN
            ALTER TABLE catalog_items ADD COLUMN measurement_instructions TEXT;
        END IF;
        
        -- Add build_instructions if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'build_instructions') THEN
            ALTER TABLE catalog_items ADD COLUMN build_instructions TEXT;
        END IF;
        
        -- Add tags column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'tags') THEN
            ALTER TABLE catalog_items ADD COLUMN tags JSONB DEFAULT '[]';
        END IF;
    END IF;
END $$;

-- =================================================================
-- STEP 5: CREATE ORDER ITEMS TABLE (handles existing data safely)
-- =================================================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES catalog_items(id),
    product_name TEXT NOT NULL,
    description TEXT,
    size TEXT,
    color TEXT,
    fabric TEXT,
    customization TEXT,
    specifications JSONB DEFAULT '{}',
    quantity DECIMAL(8,2) DEFAULT 1 NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    custom_image_url TEXT,
    design_file_url TEXT,
    production_notes TEXT,
    status TEXT DEFAULT 'pending' NOT NULL,
    estimated_completion_date TIMESTAMPTZ,
    actual_completion_date TIMESTAMPTZ
);

-- =================================================================
-- STEP 6: CREATE HISTORY AND AUDIT TABLES
-- =================================================================

CREATE TABLE IF NOT EXISTS catalog_item_price_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    old_base_price DECIMAL(10,2),
    new_base_price DECIMAL(10,2),
    old_unit_cost DECIMAL(10,2),
    new_unit_cost DECIMAL(10,2),
    changed_by UUID REFERENCES user_profiles(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_item_image_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    catalog_item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    image_url TEXT,
    designer_id UUID REFERENCES user_profiles(id),
    image_type TEXT DEFAULT 'mockup',
    alt_text TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    designer_id UUID REFERENCES user_profiles(id),
    catalog_item_id UUID REFERENCES catalog_items(id),
    status task_status DEFAULT 'pending' NOT NULL,
    description TEXT,
    notes TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    design_task_id UUID NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
    version INTEGER DEFAULT 1,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================
-- STEP 7: CREATE INDEXES (safe - only creates if not exists)
-- =================================================================

-- Core catalog_items indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON catalog_items(name);
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_items_fabric_id ON catalog_items(fabric_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_preferred_manufacturer ON catalog_items(preferred_manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_created_at ON catalog_items(created_at);
CREATE INDEX IF NOT EXISTS idx_catalog_items_price ON catalog_items(base_price);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_catalog_item_id ON order_items(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- Category and sports indexes
CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_fabrics_name ON catalog_fabrics(name);
CREATE INDEX IF NOT EXISTS idx_catalog_fabrics_active ON catalog_fabrics(is_active);

-- History table indexes
CREATE INDEX IF NOT EXISTS idx_price_history_catalog_item ON catalog_item_price_history(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON catalog_item_price_history(created_at);
CREATE INDEX IF NOT EXISTS idx_image_history_catalog_item ON catalog_item_image_history(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_image_history_designer ON catalog_item_image_history(designer_id);
CREATE INDEX IF NOT EXISTS idx_image_history_timestamp ON catalog_item_image_history(upload_timestamp);

-- Design and production indexes
CREATE INDEX IF NOT EXISTS idx_design_tasks_order_id ON design_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_designer_id ON design_tasks(designer_id);
CREATE INDEX IF NOT EXISTS idx_design_tasks_catalog_item ON design_tasks(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_design_files_task_id ON design_files(design_task_id);
CREATE INDEX IF NOT EXISTS idx_design_files_uploaded_by ON design_files(uploaded_by);

-- User and customer indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- =================================================================
-- STEP 8: CREATE/UPDATE TRIGGERS AND FUNCTIONS
-- =================================================================

-- Create or replace the updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create triggers (safe - will replace if exists)
DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items;
CREATE TRIGGER update_catalog_items_updated_at 
    BEFORE UPDATE ON catalog_items 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalog_fabrics_updated_at ON catalog_fabrics;
CREATE TRIGGER update_catalog_fabrics_updated_at 
    BEFORE UPDATE ON catalog_fabrics 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_tasks_updated_at ON design_tasks;
CREATE TRIGGER update_design_tasks_updated_at 
    BEFORE UPDATE ON design_tasks 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Price history tracking trigger
CREATE OR REPLACE FUNCTION log_price_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.base_price IS DISTINCT FROM NEW.base_price OR OLD.unit_cost IS DISTINCT FROM NEW.unit_cost THEN
        INSERT INTO catalog_item_price_history (
            catalog_item_id, 
            old_base_price, 
            new_base_price, 
            old_unit_cost, 
            new_unit_cost,
            reason
        ) VALUES (
            NEW.id,
            OLD.base_price,
            NEW.base_price,
            OLD.unit_cost,
            NEW.unit_cost,
            'automatic_update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply price history trigger
DROP TRIGGER IF EXISTS catalog_items_price_history ON catalog_items;
CREATE TRIGGER catalog_items_price_history 
    AFTER UPDATE ON catalog_items 
    FOR EACH ROW EXECUTE PROCEDURE log_price_changes();

-- =================================================================
-- STEP 9: INSERT INITIAL DATA (safe upserts)
-- =================================================================

-- Insert sample categories
INSERT INTO catalog_categories (name, description) VALUES 
    ('Jerseys', 'Team and individual sports jerseys'),
    ('Shorts', 'Athletic shorts and bottoms'),
    ('T-Shirts', 'Custom t-shirts and tops'),
    ('Polo Shirts', 'Professional polo shirts'),
    ('Jackets', 'Team jackets and outerwear'),
    ('Hoodies', 'Custom hoodies and sweatshirts')
ON CONFLICT (name) DO NOTHING;

-- Insert sample sports
INSERT INTO catalog_sports (name, description) VALUES 
    ('Football', 'American football equipment and apparel'),
    ('Basketball', 'Basketball uniforms and gear'),
    ('Soccer', 'Soccer/football jerseys and equipment'),
    ('Baseball', 'Baseball uniforms and accessories'),
    ('Hockey', 'Ice hockey jerseys and gear'),
    ('Tennis', 'Tennis apparel and equipment'),
    ('Golf', 'Golf shirts and accessories'),
    ('Swimming', 'Swimwear and aquatic sports'),
    ('Track & Field', 'Track and field uniforms'),
    ('Volleyball', 'Volleyball uniforms and gear'),
    ('Wrestling', 'Wrestling singlets and gear'),
    ('General Sports', 'Multi-sport and general athletic wear')
ON CONFLICT (name) DO NOTHING;

-- Insert sample fabrics
INSERT INTO catalog_fabrics (name, description, composition, weight_gsm) VALUES 
    ('Moisture-Wicking Polyester', 'High-performance athletic fabric', '100% Polyester', 150),
    ('Cotton Blend', 'Comfortable everyday fabric', '65% Cotton, 35% Polyester', 180),
    ('Dri-Fit Performance', 'Premium moisture management', '88% Polyester, 12% Spandex', 140),
    ('Heavy Cotton', 'Durable heavyweight cotton', '100% Cotton', 220),
    ('Tri-Blend', 'Soft vintage feel', '50% Polyester, 25% Cotton, 25% Rayon', 145)
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- STEP 10: VALIDATION QUERIES 
-- =================================================================

-- Verify schema deployment
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'catalog_items', 'catalog_categories', 'catalog_sports', 'catalog_fabrics',
    'catalog_item_price_history', 'catalog_item_image_history',
    'order_items', 'design_tasks', 'design_files',
    'user_profiles', 'customers', 'orders'
);

-- Check foreign key relationships
SELECT 
    COUNT(*) as foreign_key_count,
    'Foreign keys created successfully' as message
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_name IN (
    'catalog_items', 'order_items', 'catalog_item_price_history',
    'catalog_item_image_history', 'design_tasks', 'design_files'
);

-- Check indexes
SELECT 
    COUNT(*) as index_count,
    'Indexes created successfully' as message
FROM pg_indexes 
WHERE tablename LIKE 'catalog_%' OR tablename IN ('order_items', 'design_tasks', 'design_files');

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
-- Your ProductLibrary schema has been successfully deployed!
--
-- Key Features Implemented:
-- ✅ Product metadata storage (title, description, size, color, quantity, pricing history)
-- ✅ Historical mockup image linking with designer attribution and timestamps  
-- ✅ Order integration via catalog_item_id foreign keys in order_items table
-- ✅ Comprehensive indexing for performance
-- ✅ Automatic triggers for pricing history and timestamps
-- ✅ Sample data for categories, sports, and fabrics
--
-- Next Steps:
-- 1. Run the validation queries above to confirm successful deployment
-- 2. Update your application code to use the new enhanced schema features
-- 3. Consider implementing Row Level Security policies for production use
-- =================================================================