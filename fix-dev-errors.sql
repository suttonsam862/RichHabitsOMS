
-- Fix all missing tables and columns causing dev tool errors

-- First, ensure customers table has the required column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create the salespeople table that's missing
CREATE TABLE IF NOT EXISTS salespeople (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Employment Information
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employment_status VARCHAR(50) DEFAULT 'active',
  position_title VARCHAR(100) DEFAULT 'Sales Representative',
  manager_id UUID REFERENCES salespeople(id),
  
  -- Performance Metrics
  sales_quota DECIMAL(12,2),
  current_year_sales DECIMAL(12,2) DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  
  -- System Fields
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer_salesperson_assignments table
CREATE TABLE IF NOT EXISTS customer_salesperson_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE CASCADE,
  assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assignment_type VARCHAR(50) DEFAULT 'primary',
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id)
);

-- Create salesperson_territories table
CREATE TABLE IF NOT EXISTS salesperson_territories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID REFERENCES salespeople(id) ON DELETE CASCADE,
  territory_name VARCHAR(100) NOT NULL,
  territory_type VARCHAR(50),
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE salespeople ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_salesperson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesperson_territories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for salespeople
CREATE POLICY "Admins can manage all salespeople" ON salespeople
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for assignments
CREATE POLICY "Admins can manage assignments" ON customer_salesperson_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for territories
CREATE POLICY "Admins can manage territories" ON salesperson_territories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert a sample salesperson to fix the empty table issue
INSERT INTO salespeople (
  first_name, 
  last_name, 
  email, 
  employee_id, 
  position_title
) VALUES (
  'John', 
  'Smith', 
  'john.smith@company.com', 
  'SP0001', 
  'Senior Sales Representative'
) ON CONFLICT (email) DO NOTHING;
