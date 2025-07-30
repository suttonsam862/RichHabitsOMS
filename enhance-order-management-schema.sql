-- Enhanced Order Management Schema Migration
-- Adds comprehensive connections between salespeople, designers, manufacturers, and orders

-- Add new columns to orders table for comprehensive stakeholder connections
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS assigned_designer_id UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_manufacturer_id UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS discount DECIMAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_requirements TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
  ADD COLUMN IF NOT EXISTS rush_order BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add new columns to order_items table for detailed tracking
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS fabric TEXT,
  ADD COLUMN IF NOT EXISTS customization TEXT,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS design_file_url TEXT,
  ADD COLUMN IF NOT EXISTS production_notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'designing', 'approved', 'in_production', 'completed')),
  ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP;

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_salesperson ON orders(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_orders_designer ON orders(assigned_designer_id);
CREATE INDEX IF NOT EXISTS idx_orders_manufacturer ON orders(assigned_manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_rush ON orders(rush_order);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(estimated_delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);
CREATE INDEX IF NOT EXISTS idx_order_items_completion ON order_items(estimated_completion_date);

-- Create comprehensive view for order management with all stakeholder information
CREATE OR REPLACE VIEW order_management_view AS
SELECT 
  o.*,
  c.first_name as customer_first_name,
  c.last_name as customer_last_name,
  c.email as customer_email,
  c.company as customer_company,
  c.phone as customer_phone,
  sp.username as salesperson_username,
  sp.first_name as salesperson_first_name,
  sp.last_name as salesperson_last_name,
  d.username as designer_username,
  d.first_name as designer_first_name,
  d.last_name as designer_last_name,
  m.username as manufacturer_username,
  m.first_name as manufacturer_first_name,
  m.last_name as manufacturer_last_name,
  COUNT(oi.id) as item_count,
  AVG(CASE WHEN oi.estimated_completion_date IS NOT NULL 
      THEN EXTRACT(DAY FROM (oi.estimated_completion_date - CURRENT_DATE))
      ELSE NULL END) as avg_days_to_completion
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN user_profiles sp ON o.salesperson_id = sp.id
LEFT JOIN user_profiles d ON o.assigned_designer_id = d.id
LEFT JOIN user_profiles m ON o.assigned_manufacturer_id = m.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, c.id, sp.id, d.id, m.id;

-- Create function to automatically assign team members based on workload
CREATE OR REPLACE FUNCTION auto_assign_team_members()
RETURNS TRIGGER AS $$
DECLARE
  least_busy_designer_id UUID;
  least_busy_manufacturer_id UUID;
BEGIN
  -- Auto-assign designer with least active orders
  SELECT up.id INTO least_busy_designer_id
  FROM user_profiles up
  LEFT JOIN orders o ON up.id = o.assigned_designer_id AND o.status IN ('pending_design', 'design_in_progress')
  WHERE up.role = 'designer'
  GROUP BY up.id
  ORDER BY COUNT(o.id) ASC
  LIMIT 1;

  -- Auto-assign manufacturer with least active orders
  SELECT up.id INTO least_busy_manufacturer_id
  FROM user_profiles up
  LEFT JOIN orders o ON up.id = o.assigned_manufacturer_id AND o.status IN ('pending_production', 'in_production')
  WHERE up.role = 'manufacturer'
  GROUP BY up.id
  ORDER BY COUNT(o.id) ASC
  LIMIT 1;

  -- Update the new order with assignments
  IF least_busy_designer_id IS NOT NULL THEN
    NEW.assigned_designer_id = least_busy_designer_id;
  END IF;

  IF least_busy_manufacturer_id IS NOT NULL THEN
    NEW.assigned_manufacturer_id = least_busy_manufacturer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assignment (only if salesperson_id is set)
DROP TRIGGER IF EXISTS trigger_auto_assign_team ON orders;
CREATE TRIGGER trigger_auto_assign_team
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.salesperson_id IS NOT NULL)
  EXECUTE FUNCTION auto_assign_team_members();

-- Create function to update order status based on item statuses
CREATE OR REPLACE FUNCTION update_order_status_from_items()
RETURNS TRIGGER AS $$
DECLARE
  order_id_var UUID;
  all_completed BOOLEAN;
  any_in_production BOOLEAN;
  any_designing BOOLEAN;
BEGIN
  -- Get the order ID from the trigger
  order_id_var := CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.order_id
    ELSE NEW.order_id
  END;

  -- Check item statuses
  SELECT 
    COUNT(*) = COUNT(CASE WHEN status = 'completed' THEN 1 END),
    COUNT(CASE WHEN status = 'in_production' THEN 1 END) > 0,
    COUNT(CASE WHEN status = 'designing' THEN 1 END) > 0
  INTO all_completed, any_in_production, any_designing
  FROM order_items 
  WHERE order_id = order_id_var;

  -- Update order status based on item statuses
  UPDATE orders SET 
    status = CASE 
      WHEN all_completed THEN 'completed'
      WHEN any_in_production THEN 'in_production'
      WHEN any_designing THEN 'design_in_progress'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = order_id_var;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update order status
DROP TRIGGER IF EXISTS trigger_update_order_status ON order_items;
CREATE TRIGGER trigger_update_order_status
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_from_items();

-- Create function to get team workload statistics
CREATE OR REPLACE FUNCTION get_team_workload_stats()
RETURNS TABLE(
  role_type TEXT,
  user_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  active_orders INTEGER,
  pending_tasks INTEGER,
  avg_completion_time DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.role::TEXT,
    up.id,
    up.username,
    up.first_name,
    up.last_name,
    COUNT(CASE WHEN o.status NOT IN ('completed', 'cancelled') THEN 1 END)::INTEGER as active_orders,
    COUNT(CASE WHEN oi.status IN ('pending', 'designing', 'in_production') THEN 1 END)::INTEGER as pending_tasks,
    AVG(EXTRACT(DAY FROM (oi.actual_completion_date - oi.created_at)))::DECIMAL as avg_completion_time
  FROM user_profiles up
  LEFT JOIN orders o ON (
    (up.role = 'salesperson' AND up.id = o.salesperson_id) OR
    (up.role = 'designer' AND up.id = o.assigned_designer_id) OR
    (up.role = 'manufacturer' AND up.id = o.assigned_manufacturer_id)
  )
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE up.role IN ('salesperson', 'designer', 'manufacturer')
  GROUP BY up.id, up.role, up.username, up.first_name, up.last_name
  ORDER BY up.role, active_orders DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON order_management_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_workload_stats() TO authenticated;

-- Create indexes for the view
CREATE INDEX IF NOT EXISTS idx_order_management_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_management_created ON orders(created_at);

-- Success message
SELECT 'Enhanced order management schema migration completed successfully!' as result;