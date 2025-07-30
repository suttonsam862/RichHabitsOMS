-- Enhanced Catalog Image Variants Migration
-- This script adds support for multiple image variants in the catalog system

-- Add new columns for multiple image variants
ALTER TABLE catalog_items 
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_variants JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS fabric TEXT,
  ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS customization_options JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS min_quantity DECIMAL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_quantity DECIMAL DEFAULT 1000;

-- Create index for faster JSON queries on image_variants
CREATE INDEX IF NOT EXISTS idx_catalog_items_image_variants ON catalog_items USING GIN (image_variants);

-- Create index for faster queries on new text fields
CREATE INDEX IF NOT EXISTS idx_catalog_items_fabric ON catalog_items (fabric);
CREATE INDEX IF NOT EXISTS idx_catalog_items_description ON catalog_items (description);

-- Update existing items to have proper image_variants structure
UPDATE catalog_items 
SET image_variants = CASE 
  WHEN base_image_url IS NOT NULL THEN 
    jsonb_build_object(
      'medium', base_image_url,
      'thumbnail', base_image_url,
      'large', base_image_url,
      'original', base_image_url
    )
  ELSE '{}'::jsonb
END
WHERE image_variants = '{}'::jsonb AND base_image_url IS NOT NULL;

-- Update image_url field for backward compatibility
UPDATE catalog_items 
SET image_url = base_image_url 
WHERE image_url IS NULL AND base_image_url IS NOT NULL;

-- Ensure all JSONB fields have proper default values
UPDATE catalog_items 
SET 
  sizes = COALESCE(sizes, '[]'::jsonb),
  colors = COALESCE(colors, '[]'::jsonb),
  customization_options = COALESCE(customization_options, '[]'::jsonb),
  image_variants = COALESCE(image_variants, '{}'::jsonb)
WHERE 
  sizes IS NULL OR 
  colors IS NULL OR 
  customization_options IS NULL OR 
  image_variants IS NULL;

-- Create a function to validate image variants structure
CREATE OR REPLACE FUNCTION validate_image_variants(variants JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the JSON structure is valid for image variants
  -- Should contain keys like: thumbnail, medium, large, original, gallery
  RETURN (
    variants IS NULL OR 
    variants = '{}'::jsonb OR
    (
      jsonb_typeof(variants) = 'object' AND
      (variants ? 'thumbnail' OR variants ? 'medium' OR variants ? 'large' OR variants ? 'original' OR variants ? 'gallery')
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure image_variants has valid structure
ALTER TABLE catalog_items 
  ADD CONSTRAINT check_image_variants_structure 
  CHECK (validate_image_variants(image_variants));

-- Create a view for easy querying of catalog items with processed image data
CREATE OR REPLACE VIEW catalog_items_with_images AS
SELECT 
  *,
  CASE 
    WHEN image_variants ? 'medium' THEN image_variants->>'medium'
    WHEN image_variants ? 'large' THEN image_variants->>'large'
    WHEN image_variants ? 'original' THEN image_variants->>'original'
    ELSE image_url
  END as primary_image_url,
  CASE 
    WHEN image_variants ? 'thumbnail' THEN image_variants->>'thumbnail'
    WHEN image_variants ? 'medium' THEN image_variants->>'medium'
    ELSE image_url
  END as thumbnail_image_url,
  CASE 
    WHEN image_variants ? 'gallery' THEN jsonb_array_length(image_variants->'gallery')
    ELSE 0
  END as gallery_image_count
FROM catalog_items;

-- Create helper function to get image variants for an item
CREATE OR REPLACE FUNCTION get_catalog_item_images(item_id UUID)
RETURNS TABLE(
  variant_name TEXT,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    key as variant_name,
    value::text as image_url
  FROM catalog_items ci,
       jsonb_each_text(ci.image_variants)
  WHERE ci.id = item_id
    AND jsonb_typeof(value) = 'string';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON catalog_items TO authenticated;
GRANT SELECT ON catalog_items_with_images TO authenticated;
GRANT EXECUTE ON FUNCTION validate_image_variants(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_catalog_item_images(UUID) TO authenticated;

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_catalog_items_updated_at ON catalog_items;
CREATE TRIGGER trigger_catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_items_updated_at();

-- Success message
SELECT 'Enhanced catalog image variants migration completed successfully!' as result;