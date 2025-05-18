-- Export schema and data for Supabase migration
-- This file exports the database schema and your admin user

-- Schema export
-- Enums
SELECT 'CREATE TYPE role_type AS ENUM ' || 
       '(' || string_agg(quote_literal(enumlabel), ', ') || ');'
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'role_type';

SELECT 'CREATE TYPE order_status AS ENUM ' || 
       '(' || string_agg(quote_literal(enumlabel), ', ') || ');'
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'order_status';

SELECT 'CREATE TYPE task_status AS ENUM ' || 
       '(' || string_agg(quote_literal(enumlabel), ', ') || ');'
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'task_status';

SELECT 'CREATE TYPE payment_status AS ENUM ' || 
       '(' || string_agg(quote_literal(enumlabel), ', ') || ');'
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'payment_status';

SELECT 'CREATE TYPE message_status AS ENUM ' || 
       '(' || string_agg(quote_literal(enumlabel), ', ') || ');'
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'message_status';

-- Tables
SELECT 
  'CREATE TABLE ' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    data_type || 
    CASE 
      WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    ', '
  ) || ');'
FROM 
  information_schema.columns
WHERE 
  table_schema = 'public'
  AND table_name != 'pg_stat_statements'
GROUP BY 
  table_name;

-- Primary keys
SELECT 
  'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || ' PRIMARY KEY (' || 
  string_agg(kcu.column_name, ', ') || ');'
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE 
  tc.constraint_type = 'PRIMARY KEY' 
  AND tc.table_schema = 'public'
GROUP BY 
  tc.table_name, tc.constraint_name;

-- Foreign keys
SELECT 
  'ALTER TABLE ' || tc.table_name || ' ADD CONSTRAINT ' || tc.constraint_name || ' FOREIGN KEY (' || 
  string_agg(kcu.column_name, ', ') || ') REFERENCES ' || ccu.table_name || ' (' || 
  string_agg(ccu.column_name, ', ') || ');'
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE 
  tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
GROUP BY 
  tc.table_name, tc.constraint_name, ccu.table_name;

-- Admin user data
SELECT 
  'INSERT INTO users (id, email, username, password, first_name, last_name, role, phone, company, created_at, stripe_customer_id) VALUES (' ||
  id || ', ' ||
  quote_literal(email) || ', ' ||
  quote_literal(username) || ', ' ||
  quote_literal(password) || ', ' ||
  CASE WHEN first_name IS NULL THEN 'NULL' ELSE quote_literal(first_name) END || ', ' ||
  CASE WHEN last_name IS NULL THEN 'NULL' ELSE quote_literal(last_name) END || ', ' ||
  quote_literal(role) || ', ' ||
  CASE WHEN phone IS NULL THEN 'NULL' ELSE quote_literal(phone) END || ', ' ||
  CASE WHEN company IS NULL THEN 'NULL' ELSE quote_literal(company) END || ', ' ||
  'CURRENT_TIMESTAMP' || ', ' ||
  CASE WHEN stripe_customer_id IS NULL THEN 'NULL' ELSE quote_literal(stripe_customer_id) END || ');'
FROM users
WHERE role = 'admin';

-- Reset sequence
SELECT 'SELECT setval(''users_id_seq'', (SELECT MAX(id) FROM users));';