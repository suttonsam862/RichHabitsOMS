
-- Enhanced Invitation and Onboarding System Schema

-- Core invitations table with enhanced tracking
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  invited_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  
  -- Invitation customization
  custom_message TEXT,
  organization_context TEXT,
  expected_order_volume VARCHAR(100),
  priority_level VARCHAR(50) DEFAULT 'standard'
);

-- Onboarding progress tracking
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 8,
  completed_steps JSONB DEFAULT '[]',
  step_data JSONB DEFAULT '{}',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization profiles for business customers
CREATE TABLE IF NOT EXISTS organization_profiles (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Organization Info
  organization_name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(100) NOT NULL, -- retail, corporate, nonprofit, government, etc.
  industry VARCHAR(100),
  website_url VARCHAR(255),
  founded_year INTEGER,
  employee_count_range VARCHAR(50),
  
  -- Contact Information
  business_phone VARCHAR(20),
  business_address_line1 VARCHAR(255),
  business_address_line2 VARCHAR(255),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  
  -- Business Details
  annual_revenue_range VARCHAR(50),
  primary_market VARCHAR(100),
  target_demographic TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order preferences and requirements
CREATE TABLE IF NOT EXISTS order_preferences (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Product Preferences
  primary_product_types TEXT[], -- t-shirts, hoodies, hats, bags, etc.
  typical_order_quantity_min INTEGER,
  typical_order_quantity_max INTEGER,
  preferred_materials TEXT[], -- cotton, polyester, blends, etc.
  preferred_print_methods TEXT[], -- screen print, embroidery, heat transfer, etc.
  
  -- Quality & Budget
  quality_preference VARCHAR(50), -- budget, standard, premium
  budget_range_per_item VARCHAR(50),
  rush_order_frequency VARCHAR(50), -- never, rarely, sometimes, often
  
  -- Delivery & Timeline
  preferred_delivery_timeline VARCHAR(50), -- 1-2 weeks, 2-4 weeks, flexible
  delivery_address_same_as_business BOOLEAN DEFAULT true,
  special_delivery_requirements TEXT,
  
  -- Design Services
  needs_design_services BOOLEAN DEFAULT false,
  has_existing_artwork BOOLEAN DEFAULT false,
  brand_guidelines_available BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax exemption certificates storage
CREATE TABLE IF NOT EXISTS tax_exemption_certificates (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE CASCADE,
  
  -- Certificate Details
  certificate_type VARCHAR(100) NOT NULL, -- sales_tax, use_tax, resale, nonprofit
  certificate_number VARCHAR(100),
  issuing_state VARCHAR(100),
  expiration_date DATE,
  
  -- File Storage
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  
  -- Status & Verification
  verification_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected, expired
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP NULL,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact persons within organizations
CREATE TABLE IF NOT EXISTS organization_contacts (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE CASCADE,
  
  -- Contact Details
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  title VARCHAR(100),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Role & Permissions
  is_primary_contact BOOLEAN DEFAULT false,
  can_approve_orders BOOLEAN DEFAULT false,
  can_modify_designs BOOLEAN DEFAULT false,
  spending_limit DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Past vendor relationships and experience
CREATE TABLE IF NOT EXISTS vendor_experience (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  
  -- Previous Experience
  has_used_custom_clothing_vendors BOOLEAN DEFAULT false,
  previous_vendors TEXT[],
  satisfaction_level VARCHAR(50), -- very_unsatisfied, unsatisfied, neutral, satisfied, very_satisfied
  pain_points TEXT[],
  
  -- What they're looking for
  why_switching TEXT,
  most_important_factors TEXT[], -- price, quality, speed, service, etc.
  deal_breakers TEXT[],
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing and communication preferences
CREATE TABLE IF NOT EXISTS communication_preferences (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Communication Channels
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  phone_updates BOOLEAN DEFAULT false,
  
  -- Marketing Preferences
  promotional_emails BOOLEAN DEFAULT true,
  new_product_announcements BOOLEAN DEFAULT true,
  industry_insights BOOLEAN DEFAULT false,
  case_studies BOOLEAN DEFAULT false,
  
  -- Frequency
  communication_frequency VARCHAR(50) DEFAULT 'standard', -- minimal, standard, frequent
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_email ON onboarding_progress(email);
CREATE INDEX IF NOT EXISTS idx_organization_profiles_user_id ON organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_certificates_user_id ON tax_exemption_certificates(user_id);

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_exemption_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on business rules)
CREATE POLICY "Users can view their own invitations" ON invitations FOR SELECT USING (
  auth.email() = email OR 
  auth.uid()::text IN (SELECT id::text FROM users WHERE role IN ('admin', 'salesperson'))
);

CREATE POLICY "Users can update their own onboarding" ON onboarding_progress FOR ALL USING (
  auth.email() = email OR 
  auth.uid()::text IN (SELECT id::text FROM users WHERE role IN ('admin', 'salesperson'))
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_profiles_updated_at BEFORE UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_preferences_updated_at BEFORE UPDATE ON order_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_exemption_certificates_updated_at BEFORE UPDATE ON tax_exemption_certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_preferences_updated_at BEFORE UPDATE ON communication_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
