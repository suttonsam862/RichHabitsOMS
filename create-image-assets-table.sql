-- Create image_assets table for centralized image metadata management
-- This table tracks all images across the ThreadCraft application

CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'customer_photo',
    'catalog_image', 
    'production_image',
    'design_file',
    'order_attachment',
    'profile_image',
    'logo',
    'thumbnail',
    'variant'
  )),
  related_id UUID, -- ID of the related entity (customer_id, catalog_item_id, order_id, etc.)
  url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  visibility VARCHAR(10) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Constraints
  CONSTRAINT image_assets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT image_assets_url_not_empty CHECK (LENGTH(url) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_assets_owner_id ON image_assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_type ON image_assets(type);
CREATE INDEX IF NOT EXISTS idx_image_assets_related_id ON image_assets(related_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_visibility ON image_assets(visibility);
CREATE INDEX IF NOT EXISTS idx_image_assets_created_at ON image_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_assets_deleted_at ON image_assets(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_image_assets_owner_type ON image_assets(owner_id, type);
CREATE INDEX IF NOT EXISTS idx_image_assets_type_related ON image_assets(type, related_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_visibility_type ON image_assets(visibility, type);

-- Add RLS (Row Level Security) policies
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;

-- Allow users to view images they own or have access to based on role
CREATE POLICY "Users can view accessible images" ON image_assets
FOR SELECT USING (
  -- Users can always see their own images
  auth.uid() = owner_id
  
  -- Admin can see all images
  OR (
    auth.jwt() ->> 'role' = 'admin'
  )
  
  -- Public images are visible to authenticated users
  OR (
    visibility = 'public' 
    AND auth.role() = 'authenticated'
  )
  
  -- Role-based access for specific image types
  OR (
    visibility = 'private'
    AND (
      -- Salespersons can see customer photos and order images
      (auth.jwt() ->> 'role' = 'salesperson' AND type IN ('customer_photo', 'order_attachment'))
      
      -- Designers can see design files and production images
      OR (auth.jwt() ->> 'role' = 'designer' AND type IN ('design_file', 'production_image', 'catalog_image'))
      
      -- Manufacturers can see production images and design files
      OR (auth.jwt() ->> 'role' = 'manufacturer' AND type IN ('production_image', 'design_file'))
    )
  )
);

-- Allow users to insert images they own
CREATE POLICY "Users can insert their own images" ON image_assets
FOR INSERT WITH CHECK (
  auth.uid() = owner_id
  OR auth.jwt() ->> 'role' = 'admin'
);

-- Allow users to update their own images or admins to update any
CREATE POLICY "Users can update accessible images" ON image_assets
FOR UPDATE USING (
  auth.uid() = owner_id
  OR auth.jwt() ->> 'role' = 'admin'
  OR (
    auth.role() = 'authenticated' 
    AND (
      (auth.jwt() ->> 'role' = 'salesperson' AND type IN ('customer_photo', 'order_attachment'))
      OR (auth.jwt() ->> 'role' = 'designer' AND type IN ('design_file', 'production_image', 'catalog_image'))
      OR (auth.jwt() ->> 'role' = 'manufacturer' AND type IN ('production_image', 'design_file'))
    )
  )
);

-- Allow soft delete (setting deleted_at) for owned images
CREATE POLICY "Users can soft delete accessible images" ON image_assets
FOR UPDATE USING (
  auth.uid() = owner_id
  OR auth.jwt() ->> 'role' = 'admin'
  OR (
    auth.role() = 'authenticated' 
    AND (
      (auth.jwt() ->> 'role' = 'salesperson' AND type IN ('customer_photo', 'order_attachment'))
      OR (auth.jwt() ->> 'role' = 'designer' AND type IN ('design_file', 'production_image', 'catalog_image'))
      OR (auth.jwt() ->> 'role' = 'manufacturer' AND type IN ('production_image', 'design_file'))
    )
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_image_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_image_assets_updated_at
  BEFORE UPDATE ON image_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_image_assets_updated_at();

-- Add comments for documentation
COMMENT ON TABLE image_assets IS 'Centralized image metadata management for ThreadCraft application';
COMMENT ON COLUMN image_assets.id IS 'Primary key - UUID';
COMMENT ON COLUMN image_assets.owner_id IS 'User who owns/uploaded the image - references auth.users(id)';
COMMENT ON COLUMN image_assets.type IS 'Type of image (customer_photo, catalog_image, production_image, etc.)';
COMMENT ON COLUMN image_assets.related_id IS 'ID of related entity (customer_id, catalog_item_id, order_id, etc.)';
COMMENT ON COLUMN image_assets.url IS 'Full URL to the image in storage';
COMMENT ON COLUMN image_assets.metadata IS 'JSONB field for storing image metadata (size, dimensions, alt text, etc.)';
COMMENT ON COLUMN image_assets.visibility IS 'Image visibility - public or private';
COMMENT ON COLUMN image_assets.created_at IS 'When the image was uploaded';
COMMENT ON COLUMN image_assets.updated_at IS 'When the image metadata was last updated';
COMMENT ON COLUMN image_assets.deleted_at IS 'Soft delete timestamp - NULL means active';

-- Example metadata structure (for reference):
/*
{
  "filename": "original_filename.jpg",
  "size": 1024000,
  "width": 1920,
  "height": 1080,
  "format": "jpeg",
  "alt_text": "Product image showing blue shirt",
  "caption": "Blue cotton shirt - front view",
  "stage": "cutting", // for production images
  "variant": "thumbnail", // for image variants
  "processing_status": "completed",
  "storage_path": "catalog_items/123/images/uuid_filename.jpg",
  "bucket": "catalog_items",
  "compression_applied": true,
  "quality": 85,
  "uploaded_by_user_id": "uuid",
  "upload_session_id": "uuid"
}
*/