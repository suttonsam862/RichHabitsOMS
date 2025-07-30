-- Add JSONB capabilities field to user_profiles table for manufacturer-specific data
-- This field will store fabrics, max order volume, sports, and other manufacturer capabilities

-- Add the capabilities column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

-- Add a comment to document the field structure
COMMENT ON COLUMN user_profiles.capabilities IS 'JSONB field storing manufacturer capabilities including fabrics array, max_order_volume number, sports array, equipment list, certifications, and other manufacturer-specific metadata';

-- Create an index on the capabilities JSONB field for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_capabilities_gin 
ON user_profiles USING GIN (capabilities);

-- Update existing manufacturer users with sample capabilities data
UPDATE user_profiles 
SET capabilities = jsonb_build_object(
  'fabrics', ARRAY['Cotton', 'Polyester', 'Blend'],
  'max_order_volume', 1000,
  'sports', ARRAY['Basketball', 'Football', 'Soccer'],
  'equipment', ARRAY['Screen Printing', 'Embroidery', 'Heat Press'],
  'certifications', ARRAY['ISO 9001', 'OEKO-TEX'],
  'lead_time_days', 14,
  'specialties', ARRAY['Custom Jerseys', 'Team Uniforms'],
  'min_order_quantity', 25,
  'rush_order_available', true,
  'quality_grades', ARRAY['Premium', 'Standard']
)
WHERE role = 'manufacturer' AND (capabilities IS NULL OR capabilities = '{}');

-- Example query patterns for capabilities field:
-- 1. Find manufacturers who work with specific fabrics:
-- SELECT * FROM user_profiles WHERE role = 'manufacturer' AND capabilities->'fabrics' ? 'Cotton';

-- 2. Find manufacturers with specific max order volume:
-- SELECT * FROM user_profiles WHERE role = 'manufacturer' AND (capabilities->>'max_order_volume')::int >= 500;

-- 3. Find manufacturers who work with specific sports:
-- SELECT * FROM user_profiles WHERE role = 'manufacturer' AND capabilities->'sports' ? 'Basketball';

-- 4. Find manufacturers with rush order capability:
-- SELECT * FROM user_profiles WHERE role = 'manufacturer' AND capabilities->>'rush_order_available' = 'true';

-- Verify the update
SELECT 
  id,
  first_name,
  last_name,
  role,
  capabilities
FROM user_profiles 
WHERE role = 'manufacturer'
LIMIT 5;