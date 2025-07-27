
-- Add missing email column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a unique index on email if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique ON user_profiles(email);

-- Update existing records to have email based on username
UPDATE user_profiles 
SET email = username || '@threadcraft.com' 
WHERE email IS NULL AND username IS NOT NULL;

-- Add email constraint after updating existing data
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_email_check CHECK (email IS NOT NULL);
