-- Phase 1.1: Create Fabric Options Table
CREATE TABLE IF NOT EXISTS catalog_fabrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on name column for performance
CREATE INDEX IF NOT EXISTS idx_catalog_fabrics_name ON catalog_fabrics(name);
CREATE INDEX IF NOT EXISTS idx_catalog_fabrics_active ON catalog_fabrics(is_active);

-- Insert initial fabric data
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

-- Phase 1.2: Update Catalog Items Table
ALTER TABLE catalog_items 
ADD COLUMN IF NOT EXISTS fabric_id UUID REFERENCES catalog_fabrics(id) ON DELETE SET NULL;

-- Create index on fabric_id for join performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_fabric_id ON catalog_items(fabric_id);

-- Row Level Security (RLS) policies for catalog_fabrics
ALTER TABLE catalog_fabrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read fabrics
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read fabrics" ON catalog_fabrics
    FOR SELECT TO authenticated USING (true);

-- Allow admins to insert/update/delete fabrics
CREATE POLICY IF NOT EXISTS "Allow admins to manage fabrics" ON catalog_fabrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
                auth.users.raw_user_meta_data->>'role' = 'admin' OR
                auth.users.raw_user_meta_data->>'customRole' = 'admin' OR
                auth.users.email LIKE '%admin%'
            )
        )
    );

-- Update the existing RLS policy for catalog_items to handle fabric_id
-- (This assumes the policy already exists and needs updating)