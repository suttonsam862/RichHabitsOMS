-- Custom Clothing Order Management System - Production Seed Script
-- 
-- This script initializes the database with only essential data.
-- - Clears all tables
-- - Creates one admin user
-- - Resets all sequences
--
-- Run with: psql -f seed.sql
 
-- Clear all tables first (in order to avoid foreign key constraints)
TRUNCATE TABLE users, customers, orders, order_items, design_tasks, design_files, 
         production_tasks, messages, payments, inventory, activity_logs, user_settings CASCADE;

-- Reset all sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE customers_id_seq RESTART WITH 1;
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE design_tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE design_files_id_seq RESTART WITH 1;
ALTER SEQUENCE production_tasks_id_seq RESTART WITH 1;
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_id_seq RESTART WITH 1;
ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE user_settings_id_seq RESTART WITH 1;

-- Create admin user
-- Note: Password is hashed version of 'Arlodog2013!' - The actual hash should be regenerated 
-- using bcrypt in a production environment
INSERT INTO users (
  email, 
  username, 
  password, 
  first_name, 
  last_name, 
  role, 
  phone, 
  company, 
  created_at
) VALUES (
  'samsutton@rich-habits.com',
  'samsutton',
  '$2b$10$XQxPPGbZpWQHHD0JZW/S/OZgwG9ecZmP1S7v2vvfRYshSR3PY1WQa',
  'Sam',
  'Sutton',
  'admin',
  NULL,
  NULL,
  CURRENT_TIMESTAMP
);

-- Done! System now has one admin user and empty tables