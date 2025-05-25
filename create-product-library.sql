-- Product Library System for Salespeople
-- This creates a searchable library of products with pricing history

CREATE TABLE IF NOT EXISTS "product_library" (
  "id" SERIAL PRIMARY KEY,
  "product_name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "base_price" NUMERIC(10,2) NOT NULL,
  "material" TEXT,
  "available_sizes" TEXT[], -- Array of available sizes
  "available_colors" TEXT[], -- Array of available colors
  "supplier" TEXT,
  "supplier_sku" TEXT,
  "lead_time_days" INTEGER,
  "minimum_quantity" INTEGER DEFAULT 1,
  "tags" TEXT[], -- For easy searching
  "is_active" BOOLEAN DEFAULT true,
  "created_by" TEXT, -- User who added this product
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "last_ordered_date" TIMESTAMP WITH TIME ZONE,
  "total_times_ordered" INTEGER DEFAULT 0,
  "metadata" JSONB -- For additional flexible data
);

CREATE TABLE IF NOT EXISTS "product_pricing_history" (
  "id" SERIAL PRIMARY KEY,
  "product_library_id" INTEGER NOT NULL REFERENCES "product_library"("id") ON DELETE CASCADE,
  "order_id" INTEGER REFERENCES "orders"("id"),
  "unit_price" NUMERIC(10,2) NOT NULL,
  "quantity_ordered" INTEGER,
  "customer_id" INTEGER,
  "salesperson_id" TEXT,
  "pricing_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT -- Special pricing reasons, bulk discount, etc.
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_product_library_name ON "product_library"("product_name");
CREATE INDEX IF NOT EXISTS idx_product_library_category ON "product_library"("category");
CREATE INDEX IF NOT EXISTS idx_product_library_tags ON "product_library" USING GIN("tags");
CREATE INDEX IF NOT EXISTS idx_product_library_active ON "product_library"("is_active");
CREATE INDEX IF NOT EXISTS idx_pricing_history_product ON "product_pricing_history"("product_library_id");
CREATE INDEX IF NOT EXISTS idx_pricing_history_date ON "product_pricing_history"("pricing_date");

-- Sample products for your library
INSERT INTO "product_library" (
  "product_name", "description", "category", "base_price", "material", 
  "available_sizes", "available_colors", "supplier", "lead_time_days", 
  "minimum_quantity", "tags", "created_by"
) VALUES 
(
  'Triblend Tee', 
  'Soft tri-blend t-shirt with excellent print quality', 
  'T-Shirts', 
  12.50, 
  'Tri-blend Cotton/Polyester/Rayon',
  ARRAY['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
  ARRAY['Black', 'White', 'Navy', 'Gray', 'Red', 'Royal Blue'],
  'Premium Apparel Co',
  7,
  12,
  ARRAY['basic', 'popular', 'soft', 'comfortable'],
  'admin'
),
(
  'Performance Polo', 
  'Moisture-wicking polo shirt for corporate events', 
  'Polos', 
  18.75, 
  'Performance Polyester',
  ARRAY['S', 'M', 'L', 'XL', '2XL', '3XL'],
  ARRAY['Black', 'White', 'Navy', 'Gray', 'Red'],
  'Corporate Wear Solutions',
  10,
  6,
  ARRAY['corporate', 'moisture-wicking', 'professional'],
  'admin'
),
(
  'Fleece Hoodie', 
  'Warm and comfortable pullover hoodie', 
  'Hoodies', 
  28.00, 
  '80/20 Cotton/Polyester Fleece',
  ARRAY['S', 'M', 'L', 'XL', '2XL', '3XL'],
  ARRAY['Black', 'Gray', 'Navy', 'Maroon', 'Forest Green'],
  'Comfort Clothing Inc',
  14,
  6,
  ARRAY['warm', 'casual', 'popular', 'winter'],
  'admin'
),
(
  'Baseball Cap', 
  'Structured 6-panel baseball cap with embroidery', 
  'Headwear', 
  8.50, 
  'Cotton Twill',
  ARRAY['One Size'],
  ARRAY['Black', 'White', 'Navy', 'Red', 'Khaki'],
  'Hat Specialists LLC',
  5,
  24,
  ARRAY['embroidery', 'structured', 'classic'],
  'admin'
);

-- Sample pricing history
INSERT INTO "product_pricing_history" (
  "product_library_id", "unit_price", "quantity_ordered", "pricing_date", "notes"
) VALUES 
(1, 12.50, 100, '2025-01-15', 'Standard pricing for bulk order'),
(1, 11.75, 200, '2025-02-01', 'Volume discount for large order'),
(2, 18.75, 50, '2025-01-20', 'Corporate event order'),
(3, 28.00, 25, '2025-02-10', 'Winter promotion'),
(4, 8.50, 100, '2025-01-25', 'Team merchandise order');

COMMENT ON TABLE "product_library" IS 'Master product catalog for salespeople to reference and reuse';
COMMENT ON TABLE "product_pricing_history" IS 'Historical pricing data for products to help with quotes';