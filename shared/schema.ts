import { pgTable, text, serial, integer, decimal, timestamp, pgEnum, boolean, jsonb } from "drizzle-orm/pg-core";
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

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
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
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  country: text('country'),
});

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  salespersonId: integer('salesperson_id').references(() => users.id),
  status: orderStatusEnum('status').notNull().default('draft'),
  totalAmount: decimal('total_amount').notNull().default('0'),
  tax: decimal('tax').notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Order items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productName: text('product_name').notNull(),
  description: text('description'),
  size: text('size'),
  color: text('color'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price').notNull(),
  totalPrice: decimal('total_price').notNull(),
});

// Design tasks
export const designTasks = pgTable('design_tasks', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  designerId: integer('designer_id').references(() => users.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  notes: text('notes'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Design files
export const designFiles = pgTable('design_files', {
  id: serial('id').primaryKey(),
  designTaskId: integer('design_task_id').notNull().references(() => designTasks.id),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  filePath: text('file_path').notNull(),
  uploadedBy: integer('uploaded_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Production tasks
export const productionTasks = pgTable('production_tasks', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  manufacturerId: integer('manufacturer_id').references(() => users.id),
  status: taskStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  notes: text('notes'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').notNull().references(() => users.id),
  receiverId: integer('receiver_id').notNull().references(() => users.id),
  subject: text('subject'),
  content: text('content').notNull(),
  status: messageStatusEnum('status').notNull().default('sent'),
  orderId: integer('order_id').references(() => orders.id),
  designTaskId: integer('design_task_id').references(() => designTasks.id),
  productionTaskId: integer('production_task_id').references(() => productionTasks.id),
  createdAt: timestamp('created_at').defaultNow(),
  readAt: timestamp('read_at'),
  emailSent: boolean('email_sent').default(false),
});

// Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  amount: decimal('amount').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  stripePaymentId: text('stripe_payment_id'),
  stripeClientSecret: text('stripe_client_secret'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(),
  size: text('size'),
  color: text('color'),
  quantity: integer('quantity').notNull().default(0),
  minQuantity: integer('min_quantity').default(10),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// User settings
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  emailNotifications: boolean('email_notifications').default(true),
  theme: text('theme').default('light'),
  preferences: jsonb('preferences').default({}),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, stripeCustomerId: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertDesignTaskSchema = createInsertSchema(designTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDesignFileSchema = createInsertSchema(designFiles).omit({ id: true, createdAt: true });
export const insertProductionTaskSchema = createInsertSchema(productionTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, readAt: true, emailSent: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });

// Define types for inserting and selecting
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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

// Registration schema
export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;
