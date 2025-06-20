
-- Create missing tables for catalog management system

-- Create catalog_items table
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
  preferred_manufacturer_id UUID REFERENCES auth.users(id),
  tags JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create catalog_categories table
CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create catalog_sports table
CREATE TABLE IF NOT EXISTS catalog_sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sport ON catalog_items(sport);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_created_at ON catalog_items(created_at);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_items_updated_at();

-- Insert default categories
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

-- Insert default sports
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
('Hockey', TRUE)
ON CONFLICT (name) DO NOTHING;
