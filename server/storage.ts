import { 
  users, type User, type InsertUser,
  customers, type Customer, type InsertCustomer,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  designTasks, type DesignTask, type InsertDesignTask,
  designFiles, type DesignFile, type InsertDesignFile,
  productionTasks, type ProductionTask, type InsertProductionTask,
  messages, type Message, type InsertMessage,
  payments, type Payment, type InsertPayment,
  inventory,
  activityLogs,
  userSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray, like } from "drizzle-orm";
import { hash, compare } from "bcrypt";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByUserId(userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  getOrdersBySalespersonId(salespersonId: number): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByStripeSessionId(stripeSessionId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order>;
  
  // Order items methods
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, data: Partial<InsertOrderItem>): Promise<OrderItem>;
  deleteOrderItem(id: number): Promise<void>;
  
  // Design tasks methods
  getDesignTask(id: number): Promise<DesignTask | undefined>;
  getDesignTasksByOrderId(orderId: number): Promise<DesignTask[]>;
  getDesignTasksByDesignerId(designerId: number): Promise<DesignTask[]>;
  getAllDesignTasks(): Promise<DesignTask[]>;
  createDesignTask(designTask: InsertDesignTask): Promise<DesignTask>;
  updateDesignTask(id: number, data: Partial<InsertDesignTask>): Promise<DesignTask>;
  
  // Design files methods
  getDesignFile(id: number): Promise<DesignFile | undefined>;
  getDesignFilesByTaskId(designTaskId: number): Promise<DesignFile[]>;
  createDesignFile(designFile: InsertDesignFile): Promise<DesignFile>;
  deleteDesignFile(id: number): Promise<void>;
  
  // Production tasks methods
  getProductionTask(id: number): Promise<ProductionTask | undefined>;
  getProductionTasksByOrderId(orderId: number): Promise<ProductionTask[]>;
  getProductionTasksByManufacturerId(manufacturerId: number): Promise<ProductionTask[]>;
  createProductionTask(productionTask: InsertProductionTask): Promise<ProductionTask>;
  updateProductionTask(id: number, data: Partial<InsertProductionTask>): Promise<ProductionTask>;
  
  // Messages methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBySenderId(senderId: number): Promise<Message[]>;
  getMessagesByReceiverId(receiverId: number): Promise<Message[]>;
  getMessagesByOrderId(orderId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message>;
  markMessageAsEmailSent(id: number): Promise<Message>;
  
  // Payments methods
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByOrderId(orderId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment>;
  
  // Stripe methods
  updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User>;
  
  // Additional methods for dashboard
  getRecentOrders(limit: number): Promise<Order[]>;
  getOrderStatistics(): Promise<{status: string, count: number}[]>;
  getInventoryItems(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    // Hash password if it's being updated
    if (data.password) {
      data.password = await hash(data.password, 10);
    }
    
    const [user] = await db
      .update(users)
      .set({
        ...data,
        ...(data.password && { password: data.password }),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.userId, userId));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersBySalespersonId(salespersonId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.salespersonId, salespersonId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.status, status))
      .orderBy(desc(orders.createdAt));
  }
  
  async getOrdersByStripeSessionId(stripeSessionId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, stripeSessionId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        orderNumber,
      })
      .returning();
    return newOrder;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Order items methods
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const [orderItem] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return orderItem;
  }

  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db
      .insert(orderItems)
      .values(orderItem)
      .returning();
    return newOrderItem;
  }

  async updateOrderItem(id: number, data: Partial<InsertOrderItem>): Promise<OrderItem> {
    const [orderItem] = await db
      .update(orderItems)
      .set(data)
      .where(eq(orderItems.id, id))
      .returning();
    return orderItem;
  }

  async deleteOrderItem(id: number): Promise<void> {
    await db
      .delete(orderItems)
      .where(eq(orderItems.id, id));
  }

  // Design tasks methods
  async getDesignTask(id: number): Promise<DesignTask | undefined> {
    const [designTask] = await db.select().from(designTasks).where(eq(designTasks.id, id));
    return designTask;
  }

  async getDesignTasksByOrderId(orderId: number): Promise<DesignTask[]> {
    return await db
      .select()
      .from(designTasks)
      .where(eq(designTasks.orderId, orderId))
      .orderBy(desc(designTasks.createdAt));
  }

  async getDesignTasksByDesignerId(designerId: number): Promise<DesignTask[]> {
    return await db
      .select()
      .from(designTasks)
      .where(eq(designTasks.designerId, designerId))
      .orderBy(desc(designTasks.createdAt));
  }
  
  async getAllDesignTasks(): Promise<DesignTask[]> {
    return await db
      .select()
      .from(designTasks)
      .orderBy(desc(designTasks.createdAt));
  }

  async createDesignTask(designTask: InsertDesignTask): Promise<DesignTask> {
    const [newDesignTask] = await db
      .insert(designTasks)
      .values(designTask)
      .returning();
    return newDesignTask;
  }

  async updateDesignTask(id: number, data: Partial<InsertDesignTask>): Promise<DesignTask> {
    const [designTask] = await db
      .update(designTasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(designTasks.id, id))
      .returning();
    return designTask;
  }

  // Design files methods
  async getDesignFile(id: number): Promise<DesignFile | undefined> {
    const [designFile] = await db.select().from(designFiles).where(eq(designFiles.id, id));
    return designFile;
  }

  async getDesignFilesByTaskId(designTaskId: number): Promise<DesignFile[]> {
    return await db
      .select()
      .from(designFiles)
      .where(eq(designFiles.designTaskId, designTaskId))
      .orderBy(desc(designFiles.createdAt));
  }

  async createDesignFile(designFile: InsertDesignFile): Promise<DesignFile> {
    const [newDesignFile] = await db
      .insert(designFiles)
      .values(designFile)
      .returning();
    return newDesignFile;
  }

  async deleteDesignFile(id: number): Promise<void> {
    await db
      .delete(designFiles)
      .where(eq(designFiles.id, id));
  }

  // Production tasks methods
  async getProductionTask(id: number): Promise<ProductionTask | undefined> {
    const [productionTask] = await db.select().from(productionTasks).where(eq(productionTasks.id, id));
    return productionTask;
  }

  async getProductionTasksByOrderId(orderId: number): Promise<ProductionTask[]> {
    return await db
      .select()
      .from(productionTasks)
      .where(eq(productionTasks.orderId, orderId))
      .orderBy(desc(productionTasks.createdAt));
  }

  async getProductionTasksByManufacturerId(manufacturerId: number): Promise<ProductionTask[]> {
    return await db
      .select()
      .from(productionTasks)
      .where(eq(productionTasks.manufacturerId, manufacturerId))
      .orderBy(desc(productionTasks.createdAt));
  }

  async createProductionTask(productionTask: InsertProductionTask): Promise<ProductionTask> {
    const [newProductionTask] = await db
      .insert(productionTasks)
      .values(productionTask)
      .returning();
    return newProductionTask;
  }

  async updateProductionTask(id: number, data: Partial<InsertProductionTask>): Promise<ProductionTask> {
    const [productionTask] = await db
      .update(productionTasks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(productionTasks.id, id))
      .returning();
    return productionTask;
  }

  // Messages methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesBySenderId(senderId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.senderId, senderId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByReceiverId(receiverId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.receiverId, receiverId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByOrderId(orderId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.orderId, orderId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({
        status: 'read',
        readAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  async markMessageAsEmailSent(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({
        emailSent: true,
      })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  // Payments methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByOrderId(orderId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }
  
  // Stripe methods
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Additional methods for dashboard
  async getRecentOrders(limit: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);
  }

  async getOrderStatistics(): Promise<{status: string, count: number}[]> {
    const result = await db.execute(sql`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);
    return result.rows as {status: string, count: number}[];
  }

  async getInventoryItems(): Promise<any[]> {
    return await db
      .select()
      .from(inventory)
      .orderBy(inventory.itemName);
  }
  
  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }
  
  async assignManufacturerToOrder(orderId: number, manufacturerId: number): Promise<Order> {
    // First ensure the order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Ensure the manufacturer exists and has manufacturer role
    const [manufacturer] = await db.select().from(users).where(eq(users.id, manufacturerId));
    if (!manufacturer || manufacturer.role !== 'manufacturer') {
      throw new Error('Invalid manufacturer');
    }
    
    // Update the order with the manufacturer ID
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        manufacturerId, 
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    return updatedOrder;
  }
  
  async approveDesignTask(taskId: number): Promise<DesignTask> {
    const updates: Partial<InsertDesignTask> = { 
      status: 'approved', 
      updatedAt: new Date() 
    };
    
    const [updatedTask] = await db
      .update(designTasks)
      .set(updates)
      .where(eq(designTasks.id, taskId))
      .returning();
    
    if (!updatedTask) {
      throw new Error('Design task not found');
    }
    
    // Update the order status as well
    await db
      .update(orders)
      .set({ 
        status: 'design_approved', 
        updatedAt: new Date() 
      })
      .where(eq(orders.id, updatedTask.orderId));
    
    return updatedTask;
  }
  
  async markOrderAsPaid(orderId: number): Promise<Order> {
    // First ensure the order exists
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update the order with isPaid = true
    const [updatedOrder] = await db
      .update(orders)
      .set({ 
        isPaid: true, 
        updatedAt: new Date() 
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    // Create a payment record if it doesn't exist
    const existingPayments = await db.select().from(payments).where(eq(payments.orderId, orderId));
    if (existingPayments.length === 0) {
      await db.insert(payments).values({
        orderId,
        amount: order.totalAmount,
        status: 'completed',
        method: 'manual',
        createdAt: new Date()
      });
    } else {
      // Update existing payment to completed
      await db
        .update(payments)
        .set({ 
          status: 'completed', 
          updatedAt: new Date() 
        })
        .where(eq(payments.orderId, orderId));
    }
    
    return updatedOrder;
  }
}

export const storage = new DatabaseStorage();
