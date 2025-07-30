-- Add production_images and progress_images columns to support work-in-progress image uploads
-- Run this in Supabase SQL Editor

-- Add production_images column to orders table
DO $$
BEGIN
    -- Check if production_images column exists in orders table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'production_images'
        AND table_schema = 'public'
    ) THEN
        -- Add the column
        ALTER TABLE orders 
        ADD COLUMN production_images JSONB DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'production_images column added to orders table';
    ELSE
        RAISE NOTICE 'production_images column already exists in orders table';
    END IF;
END $$;

-- Add progress_images column to design_tasks table (if it exists)
DO $$
BEGIN
    -- Check if design_tasks table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'design_tasks'
        AND table_schema = 'public'
    ) THEN
        -- Check if progress_images column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'design_tasks' 
            AND column_name = 'progress_images'
            AND table_schema = 'public'
        ) THEN
            -- Add the column
            ALTER TABLE design_tasks 
            ADD COLUMN progress_images JSONB DEFAULT '[]'::jsonb;
            
            RAISE NOTICE 'progress_images column added to design_tasks table';
        ELSE
            RAISE NOTICE 'progress_images column already exists in design_tasks table';
        END IF;
    ELSE
        RAISE NOTICE 'design_tasks table does not exist';
    END IF;
END $$;

-- Add progress_images column to production_tasks table (if it exists)
DO $$
BEGIN
    -- Check if production_tasks table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'production_tasks'
        AND table_schema = 'public'
    ) THEN
        -- Check if progress_images column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'production_tasks' 
            AND column_name = 'progress_images'
            AND table_schema = 'public'
        ) THEN
            -- Add the column
            ALTER TABLE production_tasks 
            ADD COLUMN progress_images JSONB DEFAULT '[]'::jsonb;
            
            RAISE NOTICE 'progress_images column added to production_tasks table';
        ELSE
            RAISE NOTICE 'progress_images column already exists in production_tasks table';
        END IF;
    ELSE
        RAISE NOTICE 'production_tasks table does not exist';
    END IF;
END $$;

-- Create index on production_images for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_production_images ON orders USING GIN (production_images);

-- Add comment to document the structure
COMMENT ON COLUMN orders.production_images IS 'Array of production image objects: [{ id, url, filename, originalName, size, mimeType, caption, stage, taskType, taskId, uploadedAt }]';

RAISE NOTICE 'Production images schema setup completed successfully';