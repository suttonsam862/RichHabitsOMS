
-- Create catalog options tables directly with SQL

-- Create catalog_categories table
CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create catalog_sports table
CREATE TABLE IF NOT EXISTS catalog_sports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catalog_categories_name ON catalog_categories(name);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_active ON catalog_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_name ON catalog_sports(name);
CREATE INDEX IF NOT EXISTS idx_catalog_sports_active ON catalog_sports(is_active);

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
('Hockey', TRUE),
('Wrestling', TRUE)
ON CONFLICT (name) DO NOTHING;
