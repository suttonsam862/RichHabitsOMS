
-- Sales Management Database Schema
-- This creates comprehensive tables for managing salespeople information

-- Salespeople table with comprehensive information
CREATE TABLE IF NOT EXISTS salespeople (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  date_of_birth DATE,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  profile_photo_url TEXT,
  
  -- Employment Information
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  hire_date DATE NOT NULL,
  employment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'terminated'
  position_title VARCHAR(100) DEFAULT 'Sales Representative',
  department VARCHAR(100) DEFAULT 'Sales',
  manager_id UUID REFERENCES salespeople(id),
  
  -- Payroll Information
  base_salary DECIMAL(12,2),
  commission_rate DECIMAL(5,4), -- Percentage as decimal (e.g., 0.05 = 5%)
  hourly_rate DECIMAL(8,2),
  pay_frequency VARCHAR(20) DEFAULT 'bi-weekly', -- 'weekly', 'bi-weekly', 'monthly'
  tax_id_number VARCHAR(50), -- SSN or Tax ID (encrypted in real implementation)
  bank_account_number VARCHAR(100), -- Encrypted in real implementation
  bank_routing_number VARCHAR(20),
  
  -- Legal Information
  work_authorization_status VARCHAR(50), -- 'citizen', 'permanent_resident', 'work_visa', etc.
  background_check_completed BOOLEAN DEFAULT false,
  background_check_date DATE,
  contract_signed BOOLEAN DEFAULT false,
  contract_signed_date DATE,
  
  -- Performance Metrics
  sales_quota DECIMAL(12,2),
  current_year_sales DECIMAL(12,2) DEFAULT 0,
  total_lifetime_sales DECIMAL(12,2) DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  performance_rating DECIMAL(3,2), -- 1.00 to 5.00 scale
  
  -- Address Information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  
  -- System Fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Salesperson territories table
CREATE TABLE IF NOT EXISTS salesperson_territories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE CASCADE,
  territory_name VARCHAR(100) NOT NULL,
  territory_type VARCHAR(50), -- 'geographic', 'industry', 'account_size'
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer assignments to salespeople
CREATE TABLE IF NOT EXISTS customer_salesperson_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assignment_type VARCHAR(50) DEFAULT 'primary', -- 'primary', 'secondary', 'support'
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id)
);

-- Enhanced customer contacts table
CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile_phone VARCHAR(50),
  job_title VARCHAR(100),
  department VARCHAR(100),
  
  -- Contact Type and Priority
  contact_type VARCHAR(50) DEFAULT 'general', -- 'primary', 'billing', 'shipping', 'technical', 'general'
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  can_approve_orders BOOLEAN DEFAULT false,
  
  -- Communication Preferences
  preferred_contact_method VARCHAR(50) DEFAULT 'email', -- 'email', 'phone', 'mobile'
  contact_time_preference VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'anytime'
  communication_frequency VARCHAR(50) DEFAULT 'as_needed', -- 'daily', 'weekly', 'monthly', 'as_needed'
  
  -- Additional Information
  notes TEXT,
  birthday DATE,
  anniversary DATE,
  
  -- System Fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization file uploads table
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

-- Enable RLS
ALTER TABLE salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesperson_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_salesperson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Salespeople
CREATE POLICY "Admins can manage all salespeople" ON salespeople
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Salespeople can view their own data" ON salespeople
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for Customer Contacts
CREATE POLICY "Admins and assigned salespeople can manage contacts" ON customer_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM customer_salesperson_assignments csa
      WHERE csa.customer_id = customer_contacts.customer_id 
      AND csa.salesperson_id IN (
        SELECT id FROM salespeople WHERE user_id = auth.uid()
      )
      AND csa.is_active = true
    )
  );

-- RLS Policies for Organization Files
CREATE POLICY "Admins and assigned salespeople can manage files" ON organization_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM customer_salesperson_assignments csa
      WHERE csa.customer_id = organization_files.customer_id 
      AND csa.salesperson_id IN (
        SELECT id FROM salespeople WHERE user_id = auth.uid()
      )
      AND csa.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_salespeople_user_id ON salespeople(user_id);
CREATE INDEX idx_salespeople_employee_id ON salespeople(employee_id);
CREATE INDEX idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_is_primary ON customer_contacts(customer_id, is_primary);
CREATE INDEX idx_organization_files_customer_id ON organization_files(customer_id);
CREATE INDEX idx_customer_salesperson_assignments_customer ON customer_salesperson_assignments(customer_id);
CREATE INDEX idx_customer_salesperson_assignments_salesperson ON customer_salesperson_assignments(salesperson_id);
