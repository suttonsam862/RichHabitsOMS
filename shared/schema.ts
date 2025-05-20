import { pgTable, text, decimal, timestamp, pgEnum, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role_type', ['admin', 'salesperson', 'designer', 'manufacturer', 'customer']);
export const orderStatusEnum = pgEnum('order_status', [
  'draft', 
  'pending_design', 
  'design_in_progress', 
  'design_review', 
  'design_approved', 
  'pending_production', 
  'in_production', 
  'completed', 
  'cancelled'
]);
export const taskStatusEnum = pgEnum('task_status', [
  'pending', 
  'in_progress', 
  'submitted',
  'approved',
  'rejected',
  'completed', 
  'cancelled'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 
  'processing', 
  'completed', 
  'failed', 
  'refunded'
]);
export const messageStatusEnum = pgEnum('message_status', [
  'sent', 
  'delivered', 
  'read'
]);

// User profiles table (linked to Supabase Auth)
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  username: text('username').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: roleEnum('role').notNull().default('customer'),
  phone: text('phone'),
  company: text('company'),
  createdAt: timestamp('created_at').defaultNow(),
  stripeCustomerId: text('stripe_customer_id'),
});

// Customers table
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => userProfiles.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  country: text('country'),
  createdAt: timestamp('created_at').defaultNow()
});

// Orders table
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  salespersonId: uuid('salesperson_id').references(() => userProfiles.id),
  status: orderStatusEnum('status').notNull().default('draft'),
  totalAmount: decimal('total_amount').notNull().default('0'),
  tax: decimal('tax').notNull().default('0'),
  notes: text('notes'),
  isPaid: boolean('is_paid').notNull().default(false),
  stripeSessionId: text('stripe_session_id'),
  paymentDate: timestamp('payment_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Order items
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productName: text('product_name').notNull(),
  description: text('description'),
  size: text('size'),
  color: text('color'),
  quantity: decimal('quantity').notNull().default('1'),
  unitPrice: decimal('unit_price').notNull(),
  totalPrice: decimal('total_price').notNull(),
});

// Design tasks
export const designTasks = pgTable('design_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  designerId: uuid('designer_id').references(() => userProfiles.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  notes: text('notes'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Design files
export const designFiles = pgTable('design_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  designTaskId: uuid('design_task_id').notNull().references(() => designTasks.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  filePath: text('file_path').notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => userProfiles.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Production tasks
export const productionTasks = pgTable('production_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  manufacturerId: uuid('manufacturer_id').references(() => userProfiles.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  notes: text('notes'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').notNull().references(() => userProfiles.id),
  receiverId: uuid('receiver_id').notNull().references(() => userProfiles.id),
  subject: text('subject'),
  content: text('content').notNull(),
  status: messageStatusEnum('status').notNull().default('sent'),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  designTaskId: uuid('design_task_id').references(() => designTasks.id),
  productionTaskId: uuid('production_task_id').references(() => productionTasks.id),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
  emailSent: boolean('email_sent').default(false),
});

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: decimal('amount').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  method: text('method'),
  transactionId: text('transaction_id'),
  notes: text('notes'),
  stripePaymentId: text('stripe_payment_id'),
  stripeClientSecret: text('stripe_client_secret'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(),
  size: text('size'),
  color: text('color'),
  quantity: decimal('quantity').notNull().default('0'),
  minQuantity: decimal('min_quantity').default('10'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => userProfiles.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User settings
export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }).unique(),
  emailNotifications: boolean('email_notifications').default(true),
  theme: text('theme').default('light'),
  preferences: jsonb('preferences').default({}),
});

// Create insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ createdAt: true, stripeCustomerId: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertDesignTaskSchema = createInsertSchema(designTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDesignFileSchema = createInsertSchema(designFiles).omit({ id: true, createdAt: true });
export const insertProductionTaskSchema = createInsertSchema(productionTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, readAt: true, emailSent: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });

// Define types for inserting and selecting
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type DesignTask = typeof designTasks.$inferSelect;
export type InsertDesignTask = z.infer<typeof insertDesignTaskSchema>;

export type DesignFile = typeof designFiles.$inferSelect;
export type InsertDesignFile = z.infer<typeof insertDesignFileSchema>;

export type ProductionTask = typeof productionTasks.$inferSelect;
export type InsertProductionTask = z.infer<typeof insertProductionTaskSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Login schema for validation
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginData = z.infer<typeof loginSchema>;

// Registration schema (without password fields since Supabase Auth manages that)
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'salesperson', 'designer', 'manufacturer', 'customer']),
  phone: z.string().optional(),
  company: z.string().optional(),
});

export type RegisterData = z.infer<typeof registerSchema>;
