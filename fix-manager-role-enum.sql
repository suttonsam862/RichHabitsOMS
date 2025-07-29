
-- Fix the role_type enum to include manager
-- Run this in Supabase SQL Editor

ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'manager';

-- Verify the enum was updated
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'role_type'::regtype ORDER BY enumlabel;
