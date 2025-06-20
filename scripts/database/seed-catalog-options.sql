-- Seed script for catalog categories and sports tables
-- This script initializes the tables with default options

-- Insert default categories
INSERT INTO catalog_categories (name, is_active) VALUES
  ('T-Shirts', true),
  ('Hoodies', true),
  ('Polo Shirts', true),
  ('Jackets', true),
  ('Pants', true),
  ('Shorts', true),
  ('Accessories', true),
  ('Custom', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default sports
INSERT INTO catalog_sports (name, is_active) VALUES
  ('All Around Item', true),
  ('Basketball', true),
  ('Football', true),
  ('Soccer', true),
  ('Baseball', true),
  ('Tennis', true),
  ('Golf', true),
  ('Swimming', true),
  ('Running', true),
  ('Cycling', true),
  ('Volleyball', true),
  ('Hockey', true)
ON CONFLICT (name) DO NOTHING;