
-- Enhanced Customer Onboarding Schema
-- This creates tables for comprehensive customer data collection during registration

-- Customer organizations table
CREATE TABLE IF NOT EXISTS customer_organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'school', 'business', 'non-profit', 'government', 'sports_team', etc.
  industry VARCHAR(100),
  size VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
  annual_volume_estimate INTEGER,
  tax_exempt BOOLEAN DEFAULT false,
  tax_exemption_certificate_url TEXT,
  tax_exemption_number VARCHAR(100),
  tax_exemption_state VARCHAR(50),
  tax_exemption_expires_at DATE,
  
  -- Contact information
  primary_contact_name VARCHAR(255),
  primary_contact_title VARCHAR(100),
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Address information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer ordering preferences
CREATE TABLE IF NOT EXISTS customer_ordering_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES customer_organizations(id) ON DELETE CASCADE,
  
  -- Product categories they typically order
  primary_product_types JSONB DEFAULT '[]', -- ['t-shirts', 'hoodies', 'uniforms', 'promotional-items']
  secondary_product_types JSONB DEFAULT '[]',
  
  -- Order characteristics
  typical_order_size VARCHAR(50), -- 'small_1-50', 'medium_51-200', 'large_201-500', 'bulk_500+'
  typical_order_frequency VARCHAR(50), -- 'one-time', 'seasonal', 'monthly', 'weekly'
  budget_range VARCHAR(50), -- 'under_1k', '1k-5k', '5k-25k', '25k+'
  rush_orders_needed BOOLEAN DEFAULT false,
  
  -- Design preferences
  has_existing_designs BOOLEAN DEFAULT false,
  needs_design_services BOOLEAN DEFAULT false,
  brand_guidelines_available BOOLEAN DEFAULT false,
  
  -- Special requirements
  special_requirements TEXT,
  compliance_requirements JSONB DEFAULT '[]', -- ['NCAA', 'safety_standards', 'union_made']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer onboarding progress tracking
CREATE TABLE IF NOT EXISTS customer_onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token VARCHAR(255),
  
  -- Step completion tracking
  step_personal_info BOOLEAN DEFAULT false,
  step_organization_info BOOLEAN DEFAULT false,
  step_ordering_preferences BOOLEAN DEFAULT false,
  step_tax_exemption BOOLEAN DEFAULT false,
  step_verification BOOLEAN DEFAULT false,
  step_welcome BOOLEAN DEFAULT false,
  
  -- Current step
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 6,
  
  -- Progress metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer documents storage
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES customer_organizations(id) ON DELETE CASCADE,
  
  document_type VARCHAR(100) NOT NULL, -- 'tax_exemption', 'business_license', 'brand_guidelines'
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Document status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ordering_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own organization data" ON customer_organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM customer_ordering_preferences 
      WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own preferences" ON customer_ordering_preferences
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Users can manage their own onboarding progress" ON customer_onboarding_progress
  FOR ALL USING (customer_id = auth.uid());

CREATE POLICY "Users can manage their own documents" ON customer_documents
  FOR ALL USING (customer_id = auth.uid());

-- Admin policies
CREATE POLICY "Admins can manage all customer data" ON customer_organizations
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all preferences" ON customer_ordering_preferences
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all onboarding progress" ON customer_onboarding_progress
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all documents" ON customer_documents
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
