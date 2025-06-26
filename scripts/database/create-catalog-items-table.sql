
-- Create catalog_items table manually in Supabase dashboard
-- Go to https://supabase.com/dashboard/project/ctznfijidykgjhzpuyej/editor
-- Copy and paste this SQL into the SQL editor and execute it

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  sport VARCHAR(100) NOT NULL DEFAULT 'All Around Item',
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sku VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  base_image_url TEXT,
  measurement_chart_url TEXT,
  has_measurements BOOLEAN DEFAULT FALSE,
  measurement_instructions TEXT,
  eta_days VARCHAR(10) NOT NULL DEFAULT '7',
  preferred_manufacturer_id UUID,
  tags JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_catalog_items_updated_at
    BEFORE UPDATE ON catalog_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a few sample items to test
INSERT INTO catalog_items (name, category, sport, base_price, unit_cost, sku) VALUES
('Basic T-Shirt', 'T-Shirts', 'All Around Item', 15.99, 8.50, 'TSH-BASIC-001'),
('Performance Hoodie', 'Hoodies', 'All Around Item', 45.99, 25.00, 'HOD-PERF-001'),
('Athletic Polo', 'Polo Shirts', 'Golf', 29.99, 18.00, 'POL-ATHL-001')
ON CONFLICT (sku) DO NOTHING;
