import { SupabaseStorage } from './supabase-storage';
import type {
  UserProfile, InsertUserProfile,
  Customer, InsertCustomer,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  DesignTask, InsertDesignTask,
  DesignFile, InsertDesignFile,
  ProductionTask, InsertProductionTask,
  Message, InsertMessage,
  Payment, InsertPayment
} from "../shared/schema";

// Use correct types from schema - all IDs are UUIDs (strings)
export type User = UserProfile;
export type InsertUser = InsertUserProfile;

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer>;
  
  // Order methods
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: string): Promise<Order[]>;
  getOrdersBySalespersonId(salespersonId: string): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByStripeSessionId(stripeSessionId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order>;
  
  // Order items methods
  getOrderItem(id: string): Promise<OrderItem | undefined>;
  getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, data: Partial<InsertOrderItem>): Promise<OrderItem>;
  deleteOrderItem(id: string): Promise<void>;
  
  // Design tasks methods
  getDesignTask(id: string): Promise<DesignTask | undefined>;
  getDesignTasksByOrderId(orderId: string): Promise<DesignTask[]>;
  getDesignTasksByDesignerId(designerId: string): Promise<DesignTask[]>;
  getAllDesignTasks(): Promise<DesignTask[]>;
  createDesignTask(designTask: InsertDesignTask): Promise<DesignTask>;
  updateDesignTask(id: string, data: Partial<InsertDesignTask>): Promise<DesignTask>;
  
  // Design files methods
  getDesignFile(id: string): Promise<DesignFile | undefined>;
  getDesignFilesByTaskId(designTaskId: string): Promise<DesignFile[]>;
  createDesignFile(designFile: InsertDesignFile): Promise<DesignFile>;
  deleteDesignFile(id: string): Promise<void>;
  
  // Production tasks methods
  getProductionTask(id: string): Promise<ProductionTask | undefined>;
  getProductionTasksByOrderId(orderId: string): Promise<ProductionTask[]>;
  getProductionTasksByManufacturerId(manufacturerId: string): Promise<ProductionTask[]>;
  createProductionTask(productionTask: InsertProductionTask): Promise<ProductionTask>;
  updateProductionTask(id: string, data: Partial<InsertProductionTask>): Promise<ProductionTask>;
  
  // Messages methods
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesBySenderId(senderId: string): Promise<Message[]>;
  getMessagesByReceiverId(receiverId: string): Promise<Message[]>;
  getMessagesByOrderId(orderId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<Message>;
  markMessageAsEmailSent(id: string): Promise<Message>;
  
  // Payments methods
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByOrderId(orderId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment>;
  
  // Stripe methods
  updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  
  // Additional methods for dashboard
  getRecentOrders(limit: number): Promise<Order[]>;
  getOrderStatistics(): Promise<{status: string, count: number}[]>;
  getInventoryItems(): Promise<any[]>;
}

// Use Supabase for all database operations
export const storage = new SupabaseStorage();