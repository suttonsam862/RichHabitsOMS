-- idempotent enum creation
DO $$ BEGIN
  CREATE TYPE role_type AS ENUM ('admin', 'salesperson', 'designer', 'manufacturer', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'draft','pending_design','design_in_progress','design_review',
    'design_approved','pending_production','in_production',
    'completed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'pending','in_progress','submitted','approved','rejected','completed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','processing','completed','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent','delivered','read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users
CREATE TABLE IF NOT EXISTS users (
  id       BIGSERIAL PRIMARY KEY,
  email    TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  firstName TEXT,
  lastName  TEXT,
  role      role_type NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  stripeCustomerId TEXT,
  setupToken       TEXT,
  setupTokenExpires TIMESTAMPTZ
);

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id        BIGSERIAL PRIMARY KEY,
  userId    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firstName TEXT NOT NULL,
  lastName  TEXT NOT NULL,
  email     TEXT NOT NULL,
  phone     TEXT,
  company   TEXT,
  address   TEXT,
  city      TEXT,
  state     TEXT,
  zip       TEXT,
  country   TEXT,
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata  JSONB
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id              BIGSERIAL PRIMARY KEY,
  orderNumber     TEXT NOT NULL UNIQUE,
  customerId      BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  salespersonId   BIGINT REFERENCES users(id),
  status          order_status NOT NULL DEFAULT 'draft',
  totalAmount     NUMERIC(12,2) NOT NULL,
  paymentStatus   payment_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  createdAt       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  manufacturerId  BIGINT REFERENCES users(id),
  stripeSessionId TEXT,
  metadata        JSONB
);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
  id          BIGSERIAL PRIMARY KEY,
  orderId     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  quantity    INTEGER NOT NULL,
  unitPrice   NUMERIC(10,2) NOT NULL,
  color       TEXT,
  size        TEXT,
  material    TEXT,
  metadata    JSONB
);

-- design_tasks
CREATE TABLE IF NOT EXISTS design_tasks (
  id          BIGSERIAL PRIMARY KEY,
  orderId     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  designerId  BIGINT REFERENCES users(id),
  status      task_status NOT NULL DEFAULT 'pending',
  requirements TEXT,
  dueDate     TIMESTAMPTZ,
  createdAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMPTZ,
  metadata    JSONB
);

-- design_files
CREATE TABLE IF NOT EXISTS design_files (
  id            BIGSERIAL PRIMARY KEY,
  designTaskId  BIGINT NOT NULL REFERENCES design_tasks(id) ON DELETE CASCADE,
  userId        BIGINT NOT NULL REFERENCES users(id),
  filename      TEXT NOT NULL,
  fileType      TEXT NOT NULL,
  filePath      TEXT NOT NULL,
  notes         TEXT,
  createdAt     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata      JSONB
);

-- production_tasks
CREATE TABLE IF NOT EXISTS production_tasks (
  id            BIGSERIAL PRIMARY KEY,
  orderId       BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  manufacturerId BIGINT REFERENCES users(id),
  status        task_status NOT NULL DEFAULT 'pending',
  startDate     TIMESTAMPTZ,
  endDate       TIMESTAMPTZ,
  notes         TEXT,
  createdAt     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completedAt   TIMESTAMPTZ,
  metadata      JSONB
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  senderId   BIGINT NOT NULL REFERENCES users(id),
  receiverId BIGINT NOT NULL REFERENCES users(id),
  orderId    BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  status     message_status NOT NULL DEFAULT 'sent',
  readAt     TIMESTAMPTZ,
  createdAt  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  emailSent  BOOLEAN DEFAULT FALSE,
  metadata   JSONB
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id             BIGSERIAL PRIMARY KEY,
  orderId        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  status         payment_status NOT NULL DEFAULT 'pending',
  paymentMethod  TEXT NOT NULL,
  transactionId  TEXT,
  createdAt      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata       JSONB
);

-- inventory
CREATE TABLE IF NOT EXISTS inventory (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  quantity    INTEGER NOT NULL,
  unitPrice   NUMERIC(12,2) NOT NULL,
  category    TEXT,
  supplier    TEXT,
  reorderLevel INTEGER,
  createdAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata    JSONB
);

-- activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id         BIGSERIAL PRIMARY KEY,
  userId     BIGINT NOT NULL REFERENCES users(id),
  action     TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId   BIGINT NOT NULL,
  details    JSONB,
  createdAt  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ip         TEXT,
  userAgent  TEXT
);

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id        BIGSERIAL PRIMARY KEY,
  userId    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  value     JSONB NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_customers_userId ON customers(userId);
CREATE INDEX IF NOT EXISTS idx_orders_customerId ON orders(customerId);
CREATE INDEX IF NOT EXISTS idx_orders_salespersonId ON orders(salespersonId);
CREATE INDEX IF NOT EXISTS idx_orders_manufacturerId ON orders(manufacturerId);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_paymentStatus ON orders(paymentStatus);
CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
CREATE INDEX IF NOT EXISTS idx_design_tasks_orderId ON design_tasks(orderId);
CREATE INDEX IF NOT EXISTS idx_design_tasks_designerId ON design_tasks(designerId);
CREATE INDEX IF NOT EXISTS idx_design_tasks_status ON design_tasks(status);
CREATE INDEX IF NOT EXISTS idx_design_files_designTaskId ON design_files(designTaskId);
CREATE INDEX IF NOT EXISTS idx_production_tasks_orderId ON production_tasks(orderId);
CREATE INDEX IF NOT EXISTS idx_production_tasks_manufacturerId ON production_tasks(manufacturerId);
CREATE INDEX IF NOT EXISTS idx_production_tasks_status ON production_tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId);
CREATE INDEX IF NOT EXISTS idx_messages_receiverId ON messages(receiverId);
CREATE INDEX IF NOT EXISTS idx_messages_orderId ON messages(orderId);
CREATE INDEX IF NOT EXISTS idx_payments_orderId ON payments(orderId);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs(userId);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entityType_entityId ON activity_logs(entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_user_settings_userId ON user_settings(userId);

-- Order statistics function
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(status text, count bigint) AS $$
BEGIN
  RETURN QUERY
    SELECT o.status::text, COUNT(*) AS count
    FROM orders o
    GROUP BY o.status;
END;
$$ LANGUAGE plpgsql;