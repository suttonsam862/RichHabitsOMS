-- Add salesperson_id column to customers table for sales assignment
-- This allows customers to be assigned to specific salespeople for management
ALTER TABLE customers ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES salespeople(id);

-- Add index for better performance on salesperson queries
CREATE INDEX IF NOT EXISTS idx_customers_salesperson_id ON customers(salesperson_id);

-- Add helpful comment
COMMENT ON COLUMN customers.salesperson_id IS 'References the assigned salesperson for this customer';