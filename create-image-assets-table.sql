-- CREATE IMAGE ASSETS TABLE FOR COMPREHENSIVE TRACEABILITY
-- Run this in Supabase SQL Editor to create the image_assets table

-- Create the image_assets table with comprehensive metadata tracking
CREATE TABLE IF NOT EXISTS image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT,
  storage_bucket VARCHAR(100) NOT NULL DEFAULT 'uploads',
  
  -- Traceability tags
  uploaded_by UUID REFERENCES auth.users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  image_purpose VARCHAR(100),
  processing_status VARCHAR(50) DEFAULT 'completed',
  
  -- Timestamps and soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_image_assets_entity ON image_assets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_uploaded_by ON image_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_image_assets_purpose ON image_assets(image_purpose);
CREATE INDEX IF NOT EXISTS idx_image_assets_created_at ON image_assets(created_at);
CREATE INDEX IF NOT EXISTS idx_image_assets_deleted_at ON image_assets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_image_assets_storage_path ON image_assets(storage_path);

-- Create Row Level Security (RLS) policies
ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY;

-- Users can view images they uploaded or admin users can view all
CREATE POLICY "Users can view their uploaded images" ON image_assets
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can only upload images with their own uploaded_by tag
CREATE POLICY "Users can upload images" ON image_assets
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Users can update images they uploaded or admin users can update all
CREATE POLICY "Users can update their uploaded images" ON image_assets
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can soft delete images they uploaded or admin users can delete all
CREATE POLICY "Users can delete their uploaded images" ON image_assets
  FOR UPDATE USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add helpful comments
COMMENT ON TABLE image_assets IS 'Comprehensive image asset tracking with metadata tags for traceability';
COMMENT ON COLUMN image_assets.uploaded_by IS 'UUID reference to auth.users(id) - tracks who uploaded the image';
COMMENT ON COLUMN image_assets.entity_type IS 'Type of entity (catalog_item, order, design_task, customer, etc.)';
COMMENT ON COLUMN image_assets.entity_id IS 'UUID of the specific entity the image belongs to';
COMMENT ON COLUMN image_assets.image_purpose IS 'Purpose category (gallery, profile, production, design, logo, etc.)';
COMMENT ON COLUMN image_assets.storage_path IS 'Exact path in Supabase Storage for file location';
COMMENT ON COLUMN image_assets.processing_status IS 'Current processing state (completed, pending, failed)';
COMMENT ON COLUMN image_assets.metadata IS 'JSONB field for extensible custom metadata';

-- Insert sample data for testing (optional)
INSERT INTO image_assets (
  filename, original_filename, file_size, mime_type, storage_path, public_url,
  uploaded_by, entity_type, entity_id, image_purpose, metadata
) VALUES (
  'sample-image-001.jpg',
  'original-sample.jpg',
  2048000,
  'image/jpeg',
  'catalog_items/sample-uuid/images/sample-image-001.jpg',
  'https://your-project.supabase.co/storage/v1/object/public/uploads/catalog_items/sample-uuid/images/sample-image-001.jpg',
  (SELECT id FROM auth.users LIMIT 1),
  'catalog_item',
  '550e8400-e29b-41d4-a716-446655440000',
  'gallery',
  '{"access_count": 0, "last_access_generated": null}'::jsonb
) ON CONFLICT (storage_path) DO NOTHING;

-- Success message
SELECT 'Image assets table created successfully with indexes and RLS policies!' AS result;