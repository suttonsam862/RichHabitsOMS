-- Create catalog_items table for product catalog management
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sku VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items(category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_catalog_items_status ON catalog_items(status);
CREATE INDEX IF NOT EXISTS idx_catalog_items_created_at ON catalog_items(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_items_updated_at();

-- Insert some sample catalog items
INSERT INTO catalog_items (name, description, category, base_price, sku, status, specifications) VALUES
('Classic Cotton T-Shirt', 'Premium 100% cotton t-shirt with custom printing options', 'T-Shirts', 25.00, 'TEE-COTTON-001', 'active', '{"material": "100% Cotton", "weight": "180gsm", "sizes": ["XS", "S", "M", "L", "XL", "XXL"]}'),
('Performance Polo Shirt', 'Moisture-wicking polo shirt perfect for corporate branding', 'Polo Shirts', 35.00, 'POLO-PERF-001', 'active', '{"material": "65% Polyester, 35% Cotton", "weight": "200gsm", "features": ["moisture-wicking", "anti-wrinkle"]}'),
('Premium Hoodie', 'Heavy-weight hoodie with kangaroo pocket and custom embroidery', 'Hoodies', 55.00, 'HOOD-PREM-001', 'active', '{"material": "80% Cotton, 20% Polyester", "weight": "320gsm", "features": ["kangaroo pocket", "adjustable hood"]}'),
('Corporate Baseball Cap', 'Structured 6-panel cap with embroidered logo placement', 'Accessories', 18.00, 'CAP-CORP-001', 'active', '{"material": "100% Cotton Twill", "closure": "adjustable snapback", "panels": 6}'),
('Lightweight Jacket', 'Water-resistant windbreaker with custom screen printing', 'Jackets', 75.00, 'JACK-LIGHT-001', 'active', '{"material": "100% Nylon", "features": ["water-resistant", "packable", "reflective details"]}}')
ON CONFLICT (sku) DO NOTHING;