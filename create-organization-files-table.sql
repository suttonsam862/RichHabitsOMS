-- Create organization_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'logo', 'graphics', 'brand_guidelines', 'contract'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Google Drive Integration
  google_drive_link TEXT,
  google_drive_folder_id VARCHAR(255),
  
  -- File Status
  upload_status VARCHAR(50) DEFAULT 'uploaded', -- 'uploading', 'uploaded', 'processing', 'approved', 'rejected'
  is_primary BOOLEAN DEFAULT false, -- For logos
  
  -- Metadata
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  
  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE organization_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization_files
DROP POLICY IF EXISTS "Admins can manage all organization files" ON organization_files;
CREATE POLICY "Admins can manage all organization files" ON organization_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their organization files" ON organization_files;
CREATE POLICY "Users can view their organization files" ON organization_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = organization_files.customer_id 
      AND (
        c.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'salesperson')
        )
      )
    )
  );