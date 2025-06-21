-- Create user_invitations table for managing user invitations
-- This table stores invitation tokens and metadata for new user registrations

CREATE TABLE IF NOT EXISTS user_invitations (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  company VARCHAR(255),
  phone VARCHAR(50),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_used_at ON user_invitations(used_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_invitations_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can perform all operations
CREATE POLICY "Admins can manage all invitations" ON user_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Users can view their own invitations
CREATE POLICY "Users can view their own invitations" ON user_invitations
  FOR SELECT USING (
    auth.jwt() ->> 'email' = email
  );

-- Policy: Service role can perform all operations (for server-side operations)
CREATE POLICY "Service role full access" ON user_invitations
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE user_invitations IS 'Stores invitation tokens and metadata for new user registrations';
COMMENT ON COLUMN user_invitations.token IS 'Unique invitation token for user registration';
COMMENT ON COLUMN user_invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN user_invitations.expires_at IS 'When the invitation expires';
COMMENT ON COLUMN user_invitations.used_at IS 'When the invitation was used (NULL if unused)';
COMMENT ON COLUMN user_invitations.invited_by IS 'User who created the invitation';
COMMENT ON COLUMN user_invitations.metadata IS 'Additional invitation metadata as JSON';