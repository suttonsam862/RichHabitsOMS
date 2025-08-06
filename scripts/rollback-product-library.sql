-- ================================================================
-- PRODUCT LIBRARY ROLLBACK SCRIPT
-- Safe rollback procedures for ProductLibrary schema changes
-- ================================================================

-- WARNING: This script will remove ProductLibrary data and schema changes
-- Make sure to backup your database before running this script
-- Run each section carefully and verify results before proceeding

-- ================================================================
-- SECTION 1: BACKUP VERIFICATION
-- ================================================================
-- Verify that you have recent backups before proceeding
DO $$ 
BEGIN 
    RAISE NOTICE 'ROLLBACK SCRIPT STARTED - %', NOW();
    RAISE NOTICE 'Ensure you have verified database backups before proceeding';
    RAISE NOTICE 'This script will remove ProductLibrary tables and data';
END $$;

-- ================================================================
-- SECTION 2: DATA PRESERVATION (Optional)
-- ================================================================
-- Uncomment this section if you want to preserve some data before rollback

/*
-- Create backup tables for important data
CREATE TABLE IF NOT EXISTS backup_product_library_mockups AS 
SELECT * FROM product_library_mockups WHERE created_at > NOW() - INTERVAL '30 days';

CREATE TABLE IF NOT EXISTS backup_product_library_pricing_history AS 
SELECT * FROM product_library_pricing_history WHERE pricing_date > NOW() - INTERVAL '90 days';

-- Log backup creation
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_BACKUP', 'Created backup tables before ProductLibrary rollback', NOW());
*/

-- ================================================================
-- SECTION 3: REMOVE FOREIGN KEY DEPENDENCIES
-- ================================================================
-- Remove foreign key constraints that depend on ProductLibrary tables

BEGIN;

-- Drop foreign keys from order_items that reference catalog_items
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint 
        WHERE confrelid = 'catalog_items'::regclass 
        AND contype = 'f'
    ) LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s', r.table_name, r.conname);
        RAISE NOTICE 'Dropped foreign key constraint: % on table %', r.conname, r.table_name;
    END LOOP;
END $$;

-- Drop foreign keys from production_mockups that reference catalog_items
ALTER TABLE IF EXISTS production_mockups 
DROP CONSTRAINT IF EXISTS production_mockups_catalog_item_id_fkey;

-- Drop foreign keys from design_mockups that reference catalog_items
ALTER TABLE IF EXISTS design_mockups 
DROP CONSTRAINT IF EXISTS design_mockups_catalog_item_id_fkey;

COMMIT;

-- ================================================================
-- SECTION 4: REMOVE TRIGGERS AND FUNCTIONS
-- ================================================================
-- Remove triggers and functions added for ProductLibrary

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON catalog_items;
DROP TRIGGER IF EXISTS update_product_library_mockups_updated_at ON product_library_mockups;
DROP TRIGGER IF EXISTS update_product_library_pricing_history_updated_at ON product_library_pricing_history;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS calculate_product_library_stats();
DROP FUNCTION IF EXISTS get_product_pricing_trends();

-- Log trigger removal
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_TRIGGERS', 'Removed ProductLibrary triggers and functions', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 5: REMOVE INDEXES
-- ================================================================
-- Remove indexes created for ProductLibrary

BEGIN;

-- Drop ProductLibrary specific indexes
DROP INDEX IF EXISTS idx_catalog_items_category_sport;
DROP INDEX IF EXISTS idx_catalog_items_name_search;
DROP INDEX IF EXISTS idx_catalog_items_status_active;
DROP INDEX IF EXISTS idx_catalog_items_pricing_stats;
DROP INDEX IF EXISTS idx_catalog_items_lifecycle_stage;

DROP INDEX IF EXISTS idx_product_library_mockups_catalog_item;
DROP INDEX IF EXISTS idx_product_library_mockups_image_type;
DROP INDEX IF EXISTS idx_product_library_mockups_created_at;
DROP INDEX IF EXISTS idx_product_library_mockups_designer_id;

DROP INDEX IF EXISTS idx_product_library_pricing_history_catalog_item;
DROP INDEX IF EXISTS idx_product_library_pricing_history_date;
DROP INDEX IF EXISTS idx_product_library_pricing_history_order_id;

-- Log index removal
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_INDEXES', 'Removed ProductLibrary indexes', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 6: REMOVE COLUMNS FROM EXISTING TABLES
-- ================================================================
-- Remove columns that were added to existing tables for ProductLibrary

BEGIN;

-- Remove columns from catalog_items if they were added for ProductLibrary
ALTER TABLE catalog_items 
DROP COLUMN IF EXISTS pricing_stats CASCADE,
DROP COLUMN IF EXISTS order_stats CASCADE,
DROP COLUMN IF EXISTS mockup_stats CASCADE,
DROP COLUMN IF EXISTS lifecycle_stage CASCADE,
DROP COLUMN IF EXISTS status CASCADE,
DROP COLUMN IF EXISTS last_modified CASCADE;

-- Remove columns from orders table if added for ProductLibrary integration
ALTER TABLE orders 
DROP COLUMN IF EXISTS catalog_item_references CASCADE;

-- Remove columns from order_items if added for ProductLibrary
ALTER TABLE order_items 
DROP COLUMN IF EXISTS catalog_item_id CASCADE,
DROP COLUMN IF EXISTS historical_pricing_reference CASCADE;

-- Log column removal
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_COLUMNS', 'Removed ProductLibrary columns from existing tables', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 7: REMOVE PRODUCT LIBRARY TABLES
-- ================================================================
-- Remove tables created specifically for ProductLibrary

BEGIN;

-- Drop ProductLibrary tables in correct order (respecting dependencies)
DROP TABLE IF EXISTS product_library_pricing_history CASCADE;
DROP TABLE IF EXISTS product_library_mockups CASCADE;
DROP TABLE IF EXISTS product_library_stats CASCADE;

-- Drop enum types if they were created for ProductLibrary
DROP TYPE IF EXISTS product_lifecycle_stage CASCADE;
DROP TYPE IF EXISTS product_library_status CASCADE;
DROP TYPE IF EXISTS mockup_image_type CASCADE;

-- Log table removal
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_TABLES', 'Removed ProductLibrary tables', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 8: RESTORE ORIGINAL CATALOG_ITEMS STRUCTURE
-- ================================================================
-- Restore catalog_items table to its original structure if needed

BEGIN;

-- If catalog_items was heavily modified, restore original columns
-- This depends on your original schema - adjust as needed

-- Example: Restore original column types if they were changed
-- ALTER TABLE catalog_items ALTER COLUMN description TYPE varchar(500);
-- ALTER TABLE catalog_items ALTER COLUMN base_price TYPE decimal(10,2);

-- Restore original constraints if they were modified
-- Example:
-- ALTER TABLE catalog_items ADD CONSTRAINT check_base_price_positive 
-- CHECK (base_price > 0);

-- Log structure restoration
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_STRUCTURE', 'Restored original catalog_items structure', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 9: CLEAN UP PERMISSIONS AND ROLES
-- ================================================================
-- Remove any ProductLibrary specific permissions or roles

BEGIN;

-- Revoke ProductLibrary specific permissions
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT grantee, table_name 
        FROM information_schema.table_privileges 
        WHERE table_name LIKE 'product_library_%'
    ) LOOP
        EXECUTE format('REVOKE ALL ON TABLE %s FROM %s', r.table_name, r.grantee);
        RAISE NOTICE 'Revoked permissions on % from %', r.table_name, r.grantee;
    END LOOP;
END $$;

-- Remove ProductLibrary specific roles if they exist
DROP ROLE IF EXISTS product_library_admin;
DROP ROLE IF EXISTS product_library_designer;
DROP ROLE IF EXISTS product_library_viewer;

-- Log permission cleanup
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_PERMISSIONS', 'Cleaned up ProductLibrary permissions and roles', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ================================================================
-- SECTION 10: VERIFICATION AND CLEANUP
-- ================================================================
-- Verify rollback completion and clean up

DO $$ 
DECLARE 
    table_count INTEGER;
    column_count INTEGER;
    index_count INTEGER;
BEGIN 
    -- Check for remaining ProductLibrary tables
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name LIKE 'product_library_%';
    
    -- Check for remaining ProductLibrary columns
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE column_name LIKE '%product_library%' OR column_name LIKE '%mockup%';
    
    -- Check for remaining ProductLibrary indexes
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_product_library_%' OR indexname LIKE 'idx_%mockup%';
    
    RAISE NOTICE 'ROLLBACK VERIFICATION:';
    RAISE NOTICE 'Remaining ProductLibrary tables: %', table_count;
    RAISE NOTICE 'Remaining ProductLibrary columns: %', column_count;
    RAISE NOTICE 'Remaining ProductLibrary indexes: %', index_count;
    
    IF table_count = 0 AND column_count = 0 AND index_count = 0 THEN
        RAISE NOTICE 'ROLLBACK COMPLETED SUCCESSFULLY';
    ELSE
        RAISE WARNING 'ROLLBACK MAY BE INCOMPLETE - Review remaining objects';
    END IF;
END $$;

-- Final audit log entry
INSERT INTO system_audit_log (action, details, created_at) 
VALUES ('ROLLBACK_COMPLETED', 'ProductLibrary rollback script completed', NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- SECTION 11: POST-ROLLBACK RECOMMENDATIONS
-- ================================================================
-- Recommendations for after rollback completion

DO $$ 
BEGIN 
    RAISE NOTICE '================================================';
    RAISE NOTICE 'POST-ROLLBACK RECOMMENDATIONS:';
    RAISE NOTICE '================================================';
    RAISE NOTICE '1. Verify application functionality after rollback';
    RAISE NOTICE '2. Update application configuration to remove ProductLibrary features';
    RAISE NOTICE '3. Review and remove ProductLibrary routes from API';
    RAISE NOTICE '4. Remove ProductLibrary frontend components if not needed';
    RAISE NOTICE '5. Update documentation to reflect removed features';
    RAISE NOTICE '6. Consider backing up the current state before future changes';
    RAISE NOTICE '7. Review system_audit_log for rollback verification';
    RAISE NOTICE '================================================';
END $$;

-- ================================================================
-- ROLLBACK SCRIPT COMPLETION
-- ================================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'PRODUCT LIBRARY ROLLBACK SCRIPT COMPLETED - %', NOW();
    RAISE NOTICE 'Please verify your application functionality';
    RAISE NOTICE 'Check system_audit_log for detailed rollback history';
END $$;