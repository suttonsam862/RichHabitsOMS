
-- TODO: add fields for Salesperson Management
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payroll_file_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES user_profiles(id);

-- TODO: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_salesperson_id ON customers(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_commission_rate ON user_profiles(commission_rate);

-- TODO: Add RLS policies for salesperson data access
