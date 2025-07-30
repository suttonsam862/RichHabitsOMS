-- IMMEDIATE FIX for Men's Singlet localhost URL issue
-- Update the Men's Singlet record to remove localhost URL

UPDATE catalog_items 
SET imageUrl = NULL, 
    updated_at = NOW()
WHERE name = 'Men''s Singlet' 
  AND imageUrl LIKE '%localhost%';

-- Verify the update
SELECT id, name, imageUrl, base_image_url 
FROM catalog_items 
WHERE name = 'Men''s Singlet';