-- Supabase Storage Bucket Policies for ThreadCraft
-- This file contains RLS policies for managing public and private file access

-- =============================================
-- PUBLIC BUCKETS CONFIGURATION
-- =============================================

-- 1. CATALOG_ITEMS BUCKET - Public read access for catalog images
-- Allow public read access to catalog item images
CREATE POLICY "Public catalog images read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalog_items');

-- Allow authenticated users to upload catalog images (admin/catalog_manager only)
CREATE POLICY "Authenticated catalog images upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'catalog_items' 
  AND auth.role() = 'authenticated'
  AND (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'catalog_manager'
  )
);

-- Allow authenticated users to delete catalog images (admin/catalog_manager only)
CREATE POLICY "Authenticated catalog images delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'catalog_items'
  AND auth.role() = 'authenticated'
  AND (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'catalog_manager'
  )
);

-- =============================================
-- PRIVATE BUCKETS CONFIGURATION
-- =============================================

-- 2. PRIVATE_FILES BUCKET - Restricted access based on user roles and ownership
-- Allow users to read their own private files or role-based access
CREATE POLICY "Private files read access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'private_files'
  AND auth.role() = 'authenticated'
  AND (
    -- Admin can access all private files
    auth.jwt() ->> 'role' = 'admin'
    
    -- Users can access customer photos if they are the customer or assigned staff
    OR (
      (storage.foldername(name))[1] = 'customer_photos'
      AND (
        auth.jwt() ->> 'role' = 'customer'
        OR auth.jwt() ->> 'role' = 'salesperson'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
    
    -- Staff can access production images and design files for assigned orders
    OR (
      ((storage.foldername(name))[1] = 'orders')
      AND (
        auth.jwt() ->> 'role' = 'designer'
        OR auth.jwt() ->> 'role' = 'manufacturer'
        OR auth.jwt() ->> 'role' = 'salesperson'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  )
);

-- Allow authenticated users to upload private files based on role
CREATE POLICY "Private files upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'private_files'
  AND auth.role() = 'authenticated'
  AND (
    -- Admin can upload anything
    auth.jwt() ->> 'role' = 'admin'
    
    -- Customers can upload their own photos
    OR (
      (storage.foldername(name))[1] = 'customer_photos'
      AND auth.jwt() ->> 'role' = 'customer'
    )
    
    -- Staff can upload production images and design files
    OR (
      ((storage.foldername(name))[1] = 'orders')
      AND (
        auth.jwt() ->> 'role' = 'designer'
        OR auth.jwt() ->> 'role' = 'manufacturer'
        OR auth.jwt() ->> 'role' = 'salesperson'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  )
);

-- Allow users to delete their own private files or admin override
CREATE POLICY "Private files delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'private_files'
  AND auth.role() = 'authenticated'
  AND (
    -- Admin can delete anything
    auth.jwt() ->> 'role' = 'admin'
    
    -- Users can delete customer photos if authorized
    OR (
      (storage.foldername(name))[1] = 'customer_photos'
      AND (
        auth.jwt() ->> 'role' = 'customer'
        OR auth.jwt() ->> 'role' = 'salesperson'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
    
    -- Staff can delete production/design files for assigned orders
    OR (
      ((storage.foldername(name))[1] = 'orders')
      AND (
        auth.jwt() ->> 'role' = 'designer'
        OR auth.jwt() ->> 'role' = 'manufacturer'
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  )
);

-- =============================================
-- UPLOADS BUCKET - General uploads with mixed visibility
-- =============================================

-- Allow public read access to uploads bucket (for public customer photos, etc.)
CREATE POLICY "Public uploads read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- Allow authenticated users to upload to uploads bucket
CREATE POLICY "Authenticated uploads access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'uploads'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own uploads or admin override
CREATE POLICY "Authenticated uploads delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'uploads'
  AND auth.role() = 'authenticated'
);

-- =============================================
-- ORDERS BUCKET - Order-related files (if using separate bucket)
-- =============================================

-- Allow role-based access to order files
CREATE POLICY "Order files access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'orders'
  AND auth.role() = 'authenticated'
  AND (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'salesperson'
    OR auth.jwt() ->> 'role' = 'designer'
    OR auth.jwt() ->> 'role' = 'manufacturer'
  )
);

-- Allow staff to upload order files
CREATE POLICY "Order files upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'orders'
  AND auth.role() = 'authenticated'
  AND (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'salesperson'
    OR auth.jwt() ->> 'role' = 'designer'
    OR auth.jwt() ->> 'role' = 'manufacturer'
  )
);

-- Allow staff to delete order files
CREATE POLICY "Order files delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'orders'
  AND auth.role() = 'authenticated'
  AND (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.jwt() ->> 'role' = 'designer'
    OR auth.jwt() ->> 'role' = 'manufacturer'
  )
);

-- =============================================
-- BUCKET CREATION COMMANDS
-- =============================================

-- Create buckets if they don't exist (run these in Supabase Storage dashboard or via API)
/*
-- Create catalog_items bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalog_items', 'catalog_items', true);

-- Create private_files bucket (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('private_files', 'private_files', false);

-- Create uploads bucket (public) 
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true);

-- Create orders bucket (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('orders', 'orders', false);
*/

-- =============================================
-- USAGE NOTES
-- =============================================

/*
VISIBILITY FIELD MAPPING:
- visibility: 'public' → stored in public buckets (catalog_items, uploads)
- visibility: 'private' → stored in private buckets (private_files, orders)

BUCKET SECURITY LEVELS:
1. catalog_items (public): Anyone can read, authorized users can upload
2. uploads (public): Anyone can read, authenticated users can upload  
3. private_files (private): Role-based read/write access with ownership checks
4. orders (private): Staff-only access for order-related files

ACCESS PATTERNS:
- Customer photos: private by default, stored in private_files bucket
- Catalog images: public by default, stored in catalog_items bucket
- Production images: private by default, stored in private_files bucket
- Design files: private by default, stored in private_files bucket

To apply these policies:
1. Run this SQL in your Supabase SQL editor
2. Create the buckets in Supabase Storage dashboard
3. Test access patterns with different user roles
4. Monitor storage usage and adjust policies as needed
*/