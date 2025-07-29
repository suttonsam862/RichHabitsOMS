-- This SQL script creates only essential tables with minimal RLS policies
-- Run this in the Supabase SQL Editor

-- Create enums
CREATE TYPE IF NOT EXISTS "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer', 'manager');
CREATE TYPE IF NOT EXISTS "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE IF NOT EXISTS "message_status" AS ENUM ('sent', 'delivered', 'read');

-- Drop existing table first if needed
DROP TABLE IF EXISTS "user_profiles";

-- Create user profiles table without RLS initially
CREATE TABLE "user_profiles" (
  "id" UUID PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" role_type NOT NULL DEFAULT 'customer',
  "phone" TEXT,
  "company" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripe_customer_id" TEXT
);

-- Simple policy to allow all operations for now (we can tighten this later)
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for now" ON "user_profiles" FOR ALL USING (true);

-- Customers table
CREATE TABLE IF NOT EXISTS "customers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "company" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "country" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple policy to allow all operations for customers too
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for customers" ON "customers" FOR ALL USING (true);