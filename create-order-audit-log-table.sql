-- Create the order audit log table for tracking order changes
CREATE TABLE IF NOT EXISTS order_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'order',
  entity_id UUID,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changes_summary TEXT,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_order_id ON order_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON order_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON order_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON order_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON order_audit_log(entity_type, entity_id);

-- Add comments for documentation
COMMENT ON TABLE order_audit_log IS 'Audit log for tracking all changes to orders and related entities';
COMMENT ON COLUMN order_audit_log.order_id IS 'ID of the order being audited';
COMMENT ON COLUMN order_audit_log.user_id IS 'ID of the user who made the change';
COMMENT ON COLUMN order_audit_log.action IS 'Type of action performed (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN order_audit_log.entity_type IS 'Type of entity changed (order, order_item, assignment, etc.)';
COMMENT ON COLUMN order_audit_log.entity_id IS 'ID of the specific entity that was changed';
COMMENT ON COLUMN order_audit_log.field_name IS 'Name of the specific field that was changed';
COMMENT ON COLUMN order_audit_log.old_value IS 'Previous value before the change';
COMMENT ON COLUMN order_audit_log.new_value IS 'New value after the change';
COMMENT ON COLUMN order_audit_log.changes_summary IS 'Human-readable summary of the changes';
COMMENT ON COLUMN order_audit_log.metadata IS 'Additional context (IP, user agent, etc.)';

-- Create a trigger function to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_audit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.timestamp = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update timestamp on row updates
DROP TRIGGER IF EXISTS update_audit_timestamp_trigger ON order_audit_log;
CREATE TRIGGER update_audit_timestamp_trigger
  BEFORE UPDATE ON order_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_timestamp();

-- Insert a test entry to verify the table is working
INSERT INTO order_audit_log (
  order_id,
  user_id,
  action,
  entity_type,
  changes_summary,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  NULL,
  'SYSTEM_INITIALIZED',
  'system',
  'Order audit log table created and initialized',
  '{"source": "sql_migration", "version": "1.0.0"}'::jsonb
);

-- Verify the table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_audit_log'
ORDER BY ordinal_position;