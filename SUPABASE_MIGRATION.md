# Supabase Migration Instructions

## Step 1: Run This Script in Supabase SQL Editor

Log into your Supabase dashboard, go to the SQL Editor, and run this script:

```sql
-- Create enums
CREATE TYPE "role_type" AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
CREATE TYPE "order_status" AS ENUM ('draft', 'pending_design', 'design_in_progress', 'design_review', 'design_approved', 'pending_production', 'in_production', 'completed', 'cancelled');
CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'rejected', 'completed', 'cancelled');
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE "message_status" AS ENUM ('sent', 'delivered', 'read');

-- Create tables
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "role" role_type NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "stripeCustomerId" TEXT,
  "setupToken" TEXT,
  "setupTokenExpires" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE "customers" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "company" TEXT,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "country" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE TABLE "orders" (
  "id" SERIAL PRIMARY KEY,
  "orderNumber" TEXT NOT NULL UNIQUE,
  "customerId" INTEGER NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "salespersonId" INTEGER REFERENCES "users"("id"),
  "status" order_status NOT NULL DEFAULT 'draft',
  "totalAmount" NUMERIC(10,2) NOT NULL,
  "paymentStatus" payment_status NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "manufacturerId" INTEGER REFERENCES "users"("id"),
  "stripeSessionId" TEXT,
  "metadata" JSONB
);

CREATE TABLE "order_items" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" NUMERIC(10,2) NOT NULL,
  "color" TEXT,
  "size" TEXT,
  "material" TEXT,
  "metadata" JSONB
);

CREATE TABLE "design_tasks" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "designerId" INTEGER REFERENCES "users"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "requirements" TEXT,
  "dueDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB
);

CREATE TABLE "design_files" (
  "id" SERIAL PRIMARY KEY,
  "designTaskId" INTEGER NOT NULL REFERENCES "design_tasks"("id") ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "filename" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE TABLE "production_tasks" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "manufacturerId" INTEGER REFERENCES "users"("id"),
  "status" task_status NOT NULL DEFAULT 'pending',
  "startDate" TIMESTAMP WITH TIME ZONE,
  "endDate" TIMESTAMP WITH TIME ZONE,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB
);

CREATE TABLE "messages" (
  "id" SERIAL PRIMARY KEY,
  "senderId" INTEGER NOT NULL REFERENCES "users"("id"),
  "receiverId" INTEGER NOT NULL REFERENCES "users"("id"),
  "orderId" INTEGER REFERENCES "orders"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "readAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "emailSent" BOOLEAN DEFAULT false,
  "metadata" JSONB
);

CREATE TABLE "payments" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount" NUMERIC(10,2) NOT NULL,
  "status" payment_status NOT NULL DEFAULT 'pending',
  "paymentMethod" TEXT NOT NULL,
  "transactionId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE TABLE "inventory" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitPrice" NUMERIC(10,2) NOT NULL,
  "category" TEXT,
  "supplier" TEXT,
  "reorderLevel" INTEGER,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB
);

CREATE TABLE "activity_logs" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id"),
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" INTEGER NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "ip" TEXT,
  "userAgent" TEXT
);

CREATE TABLE "user_settings" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_userId ON customers(userId);
CREATE INDEX idx_orders_customerId ON orders(customerId);
CREATE INDEX idx_orders_salespersonId ON orders(salespersonId);
CREATE INDEX idx_orders_manufacturerId ON orders(manufacturerId);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_paymentStatus ON orders(paymentStatus);
CREATE INDEX idx_orderItems_orderId ON order_items(orderId);
CREATE INDEX idx_designTasks_orderId ON design_tasks(orderId);
CREATE INDEX idx_designTasks_designerId ON design_tasks(designerId);
CREATE INDEX idx_designTasks_status ON design_tasks(status);
CREATE INDEX idx_designFiles_designTaskId ON design_files(designTaskId);
CREATE INDEX idx_productionTasks_orderId ON production_tasks(orderId);
CREATE INDEX idx_productionTasks_manufacturerId ON production_tasks(manufacturerId);
CREATE INDEX idx_productionTasks_status ON production_tasks(status);
CREATE INDEX idx_messages_senderId ON messages(senderId);
CREATE INDEX idx_messages_receiverId ON messages(receiverId);
CREATE INDEX idx_messages_orderId ON messages(orderId);
CREATE INDEX idx_payments_orderId ON payments(orderId);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_activityLogs_userId ON activity_logs(userId);
CREATE INDEX idx_activityLogs_entityType_entityId ON activity_logs(entityType, entityId);
CREATE INDEX idx_userSettings_userId ON user_settings(userId);

-- Create functions for order statistics
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(status text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT o.status::text, COUNT(*) as count
  FROM orders o
  GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;
```

## Step 2: Create Admin User

After you've run the database migration in Step 1, come back here and run this command to create the admin user:

```
npx tsx server/create-admin-user.ts
```

This will create an admin user with:
- Email: samsutton@rich-habits.com  
- Password: Arlodog2013!