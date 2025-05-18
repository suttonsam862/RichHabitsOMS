-- Supabase Migration Script for Custom Clothing App
-- Run this script in the Supabase SQL Editor to set up your database

-- Create enum types
CREATE TYPE role_type AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE order_status AS ENUM ('pending_production', 'in_production', 'completed', 'draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE message_status AS ENUM ('unread', 'read');

-- Create tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role role_type NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  stripe_customer_id VARCHAR(100)
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  shipping_address TEXT,
  billing_address TEXT,
  preferences JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  salesperson_id INTEGER REFERENCES users(id),
  status order_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10, 2),
  shipping_address TEXT,
  billing_address TEXT,
  manufacturer_id INTEGER REFERENCES users(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  stripe_session_id VARCHAR(100)
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  color VARCHAR(50),
  size VARCHAR(10),
  description TEXT,
  image_url VARCHAR(255),
  metadata JSONB
);

CREATE TABLE design_tasks (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  designer_id INTEGER REFERENCES users(id),
  status task_status NOT NULL DEFAULT 'pending',
  description TEXT,
  requirements TEXT,
  notes TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE design_files (
  id SERIAL PRIMARY KEY,
  design_task_id INTEGER NOT NULL REFERENCES design_tasks(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production_tasks (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  manufacturer_id INTEGER REFERENCES users(id),
  status task_status NOT NULL DEFAULT 'pending',
  description TEXT,
  requirements TEXT,
  notes TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  order_id INTEGER REFERENCES orders(id),
  content TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'unread',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  email_sent BOOLEAN DEFAULT false
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  amount DECIMAL(10, 2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_id VARCHAR(100),
  payment_method VARCHAR(50),
  receipt_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(10, 2),
  category VARCHAR(50),
  supplier VARCHAR(100),
  reorder_point INTEGER,
  metadata JSONB
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_preferences JSONB,
  theme VARCHAR(20),
  language VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin user
INSERT INTO users (
  email, 
  username, 
  password, 
  first_name, 
  last_name, 
  role, 
  created_at
) VALUES (
  'samsutton@rich-habits.com',
  'samsutton',
  '$2b$10$XQxPPGbZpWQHHD0JZW/S/OZgwG9ecZmP1S7v2vvfRYshSR3PY1WQa',
  'Sam',
  'Sutton',
  'admin',
  CURRENT_TIMESTAMP
);

-- Set up row-level security (RLS) policies for security
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for each role
-- Admin can see and do everything
CREATE POLICY admin_all_access ON users FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON customers FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON orders FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON order_items FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON design_tasks FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON design_files FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON production_tasks FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON messages FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON payments FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON inventory FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON activity_logs FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));
CREATE POLICY admin_all_access ON user_settings FOR ALL TO authenticated USING (auth.uid() IN (SELECT auth.uid() FROM users WHERE role = 'admin'));

-- Add indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_salesperson_id ON orders(salesperson_id);
CREATE INDEX idx_orders_manufacturer_id ON orders(manufacturer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_design_tasks_order_id ON design_tasks(order_id);
CREATE INDEX idx_design_tasks_designer_id ON design_tasks(designer_id);
CREATE INDEX idx_design_files_design_task_id ON design_files(design_task_id);
CREATE INDEX idx_production_tasks_order_id ON production_tasks(order_id);
CREATE INDEX idx_production_tasks_manufacturer_id ON production_tasks(manufacturer_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_modtime
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_design_tasks_modtime
    BEFORE UPDATE ON design_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_production_tasks_modtime
    BEFORE UPDATE ON production_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_payments_modtime
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_settings_modtime
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();