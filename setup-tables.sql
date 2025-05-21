-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  phone VARCHAR(50),
  company VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create customer invites table
CREATE TABLE IF NOT EXISTS customer_invites (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  invited_by UUID REFERENCES user_profiles(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create order inquiries table
CREATE TABLE IF NOT EXISTS order_inquiries (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES user_profiles(id),
  product_type VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  timeline VARCHAR(255),
  budget DECIMAL(10, 2),
  attachments TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_invites_email ON customer_invites(email);
CREATE INDEX IF NOT EXISTS idx_customer_invites_token ON customer_invites(token);
CREATE INDEX IF NOT EXISTS idx_order_inquiries_customer ON order_inquiries(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_inquiries_status ON order_inquiries(status);