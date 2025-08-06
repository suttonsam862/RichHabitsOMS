
-- Product Library System Schema
-- This supports historical product tracking with mockups and metadata

-- Main product library table
CREATE TABLE IF NOT EXISTS product_library (
  id BIGSERIAL PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  base_price DECIMAL(10,2),
  material VARCHAR(100),
  available_sizes TEXT[], -- JSON array of sizes
  available_colors TEXT[], -- JSON array of colors
  supplier VARCHAR(255),
  supplier_sku VARCHAR(100),
  lead_time_days INTEGER,
  minimum_quantity INTEGER DEFAULT 1,
  tags TEXT[], -- JSON array of tags for search
  
  -- Usage statistics
  total_times_ordered INTEGER DEFAULT 0,
  last_ordered_date TIMESTAMP WITH TIME ZONE,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(product_name, '') || ' ' || 
      COALESCE(description, '') || ' ' || 
      COALESCE(category, '') || ' ' ||
      COALESCE(material, '') || ' ' ||
      array_to_string(COALESCE(tags, '{}'), ' ')
    )
  ) STORED
);

-- Product pricing history from actual orders
CREATE TABLE IF NOT EXISTS product_pricing_history (
  id BIGSERIAL PRIMARY KEY,
  product_library_id BIGINT REFERENCES product_library(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  
  unit_price DECIMAL(10,2) NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  size VARCHAR(50),
  color VARCHAR(50),
  customizations JSONB,
  
  pricing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product mockups and design files
CREATE TABLE IF NOT EXISTS product_mockups (
  id BIGSERIAL PRIMARY KEY,
  product_library_id BIGINT REFERENCES product_library(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  design_task_id BIGINT REFERENCES design_tasks(id) ON DELETE SET NULL,
  
  -- Image details
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  medium_url TEXT,
  original_url TEXT,
  
  -- Mockup metadata
  mockup_type VARCHAR(50) DEFAULT 'product_render', -- product_render, lifestyle, technical, etc.
  view_angle VARCHAR(50), -- front, back, side, flat_lay, etc.
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Designer and upload info
  uploaded_by VARCHAR(255),
  designer_notes TEXT,
  client_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link products to actual order items for tracking
CREATE TABLE IF NOT EXISTS product_order_links (
  id BIGSERIAL PRIMARY KEY,
  product_library_id BIGINT REFERENCES product_library(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  order_item_index INTEGER, -- Which item in the order's items array
  
  -- Capture the exact configuration used
  size_used VARCHAR(50),
  color_used VARCHAR(50),
  quantity_ordered INTEGER,
  unit_price_paid DECIMAL(10,2),
  customizations_used JSONB,
  
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(order_id, order_item_index) -- Prevent duplicate links
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_library_category ON product_library(category);
CREATE INDEX IF NOT EXISTS idx_product_library_active ON product_library(is_active);
CREATE INDEX IF NOT EXISTS idx_product_library_search ON product_library USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_product_library_times_ordered ON product_library(total_times_ordered DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_history_product ON product_pricing_history(product_library_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_date ON product_pricing_history(pricing_date DESC);

CREATE INDEX IF NOT EXISTS idx_mockups_product ON product_mockups(product_library_id);
CREATE INDEX IF NOT EXISTS idx_mockups_primary ON product_mockups(product_library_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_mockups_display_order ON product_mockups(product_library_id, display_order);

-- RLS Policies
ALTER TABLE product_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_mockups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_links ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read product_library for authenticated users" ON product_library
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read pricing_history for authenticated users" ON product_pricing_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read mockups for authenticated users" ON product_mockups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read order_links for authenticated users" ON product_order_links
  FOR SELECT TO authenticated USING (true);

-- Allow insert/update for admin and salesperson roles
CREATE POLICY "Allow insert product_library for admin/salesperson" ON product_library
  FOR INSERT TO authenticated WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'salesperson', 'designer')
  );

CREATE POLICY "Allow update product_library for admin/salesperson" ON product_library
  FOR UPDATE TO authenticated USING (
    auth.jwt() ->> 'role' IN ('admin', 'salesperson', 'designer')
  );

CREATE POLICY "Allow insert mockups for admin/salesperson/designer" ON product_mockups
  FOR INSERT TO authenticated WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'salesperson', 'designer')
  );

CREATE POLICY "Allow update mockups for admin/salesperson/designer" ON product_mockups
  FOR UPDATE TO authenticated USING (
    auth.jwt() ->> 'role' IN ('admin', 'salesperson', 'designer')
  );

-- Auto-insert pricing history when orders are created
CREATE OR REPLACE FUNCTION auto_insert_pricing_history()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_id BIGINT;
BEGIN
  -- Loop through order items and create pricing history for linked products
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Check if this item is linked to a product library item
    SELECT product_library_id INTO product_id 
    FROM product_order_links 
    WHERE order_id = NEW.id 
    AND order_item_index = (item->>'index')::integer;
    
    IF product_id IS NOT NULL THEN
      INSERT INTO product_pricing_history (
        product_library_id,
        order_id,
        customer_id,
        unit_price,
        quantity_ordered,
        size,
        color,
        customizations,
        pricing_date
      ) VALUES (
        product_id,
        NEW.id,
        NEW.customer_id,
        (item->>'unit_price')::decimal,
        (item->>'quantity')::integer,
        item->>'size',
        item->>'color',
        item->'customizations',
        NEW.created_at
      );
      
      -- Update usage statistics
      UPDATE product_library 
      SET 
        total_times_ordered = total_times_ordered + (item->>'quantity')::integer,
        last_ordered_date = NEW.created_at
      WHERE id = product_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_pricing_history
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_pricing_history();
