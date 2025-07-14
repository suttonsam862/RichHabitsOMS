
-- Final fix for build_instructions column
-- Run this in Supabase SQL Editor

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'catalog_items' 
        AND column_name = 'build_instructions'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE catalog_items 
        ADD COLUMN build_instructions TEXT;
        
        RAISE NOTICE 'build_instructions column added successfully';
    ELSE
        RAISE NOTICE 'build_instructions column already exists';
    END IF;
    
    -- Verify column was added
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'catalog_items' 
        AND column_name = 'build_instructions'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Verification: build_instructions column is present';
    ELSE
        RAISE NOTICE 'Error: build_instructions column was not created';
    END IF;
END $$;

-- Also ensure proper permissions exist
GRANT SELECT, INSERT, UPDATE ON catalog_items TO authenticated;
