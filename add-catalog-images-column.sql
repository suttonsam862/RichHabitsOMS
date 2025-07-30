-- Add images column to catalog_items table
-- This column will store an array of image objects with metadata

ALTER TABLE catalog_items 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Add an index on the images column for better query performance
CREATE INDEX IF NOT EXISTS idx_catalog_items_images ON catalog_items USING GIN (images);

-- Comment on the column
COMMENT ON COLUMN catalog_items.images IS 'Array of image objects: [{ id, url, alt, isPrimary, uploadedAt }]';

-- Update existing catalog items to have empty images array if null
UPDATE catalog_items 
SET images = '[]'::jsonb 
WHERE images IS NULL;

-- Ensure all catalog items have at least an empty array
ALTER TABLE catalog_items 
ALTER COLUMN images SET DEFAULT '[]'::jsonb;

-- Add constraint to ensure images is always an array
ALTER TABLE catalog_items 
ADD CONSTRAINT catalog_items_images_is_array 
CHECK (jsonb_typeof(images) = 'array');

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'catalog_items' AND column_name = 'images';

-- Show sample structure
SELECT 
  id, 
  name, 
  jsonb_typeof(images) as images_type, 
  jsonb_array_length(images) as images_count
FROM catalog_items 
LIMIT 5;