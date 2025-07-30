-- Create image_assets table for comprehensive image metadata and traceability
-- This table stores all image metadata with tags for uploaded_by, entity_type, entity_id

CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic image information
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Storage information
  storage_path TEXT NOT NULL UNIQUE, -- Path in Supabase Storage
  public_url TEXT, -- Public accessible URL
  storage_bucket VARCHAR(100) NOT NULL DEFAULT 'uploads',
  
  -- Traceability tags
  uploaded_by UUID REFERENCES auth.users(id), -- Who uploaded the image
  entity_type VARCHAR(50) NOT NULL, -- 'catalog_item', 'order', 'design_task', 'customer', etc.
  entity_id UUID NOT NULL, -- ID of the related entity
  
  -- Image metadata
  image_purpose VARCHAR(100), -- 'gallery', 'profile', 'production', 'design', 'logo', etc.
  alt_text TEXT,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  
  -- Processing information
  image_width INTEGER,
  image_height INTEGER,
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL, -- Soft delete support
  
  -- JSON metadata for additional information
  metadata JSONB DEFAULT '{}',
  
  -- Indexes for performance
  CONSTRAINT valid_entity_type CHECK (entity_type IN (
    'catalog_item', 
    'order', 
    'design_task', 
    'customer', 
    'manufacturer', 
    'user_profile',
    'organization'
  )),
  
  CONSTRAINT valid_image_purpose CHECK (image_purpose IN (
    'gallery', 
    'profile', 
    'production', 
    'design', 
    'logo', 
    'thumbnail',
    'hero',
    'attachment'
  )),
  
  CONSTRAINT valid_processing_status CHECK (processing_status IN (
    'pending',
    'processing', 
    'completed', 
    'failed'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_assets_entity ON image_assets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_uploaded_by ON image_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_image_assets_created_at ON image_assets(created_at);
CREATE INDEX IF NOT EXISTS idx_image_assets_storage_path ON image_assets(storage_path);
CREATE INDEX IF NOT EXISTS idx_image_assets_deleted_at ON image_assets(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_image_assets_purpose ON image_assets(image_purpose);

-- GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS idx_image_assets_metadata ON image_assets USING GIN(metadata);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_image_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_image_assets_updated_at
  BEFORE UPDATE ON image_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_image_assets_updated_at();

-- RLS Policies for image_assets table
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view images they uploaded or images related to entities they have access to
CREATE POLICY "Users can view their uploaded images" ON image_assets
  FOR SELECT
  USING (
    uploaded_by = auth.uid() OR
    -- Admin users can see all
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- Users can see images for entities they have access to (implement based on your access control)
    entity_type = 'catalog_item' -- Catalog items are generally viewable
  );

-- Policy: Users can insert images they upload
CREATE POLICY "Users can upload images" ON image_assets
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Users can update images they uploaded or admins can update any
CREATE POLICY "Users can update their images" ON image_assets
  FOR UPDATE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'salesperson')
    )
  );

-- Policy: Users can soft delete images they uploaded or admins can delete any
CREATE POLICY "Users can delete their images" ON image_assets
  FOR UPDATE
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'salesperson')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE image_assets IS 'Comprehensive image metadata and traceability table';
COMMENT ON COLUMN image_assets.uploaded_by IS 'User who uploaded the image (auth.users.id)';
COMMENT ON COLUMN image_assets.entity_type IS 'Type of entity this image belongs to';
COMMENT ON COLUMN image_assets.entity_id IS 'ID of the specific entity this image belongs to';
COMMENT ON COLUMN image_assets.image_purpose IS 'Purpose/category of the image (gallery, profile, etc.)';
COMMENT ON COLUMN image_assets.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN image_assets.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN image_assets.metadata IS 'Additional JSON metadata for extensibility';