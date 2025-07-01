import { supabase } from './db';
import type {
  User, InsertUser,
  Customer, InsertCustomer,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  DesignTask, InsertDesignTask,
  DesignFile, InsertDesignFile,
  ProductionTask, InsertProductionTask,
  Message, InsertMessage,
  Payment, InsertPayment
} from "../shared/schema";
import { IStorage } from './storage';

/**
 * Supabase implementation of storage interface
 * This uses the Supabase JS SDK to communicate over HTTPS instead of direct PostgreSQL connections
 * All IDs are UUIDs (strings) as per the database schema
 */
export class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Note: user_profiles table doesn't contain email field in our schema
    // This method is not applicable to current schema structure
    console.warn('getUserByEmail called but user_profiles table does not contain email field');
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert(userData)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
    }
    
    return data as User;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedUser) {
      throw new Error(`Failed to update user: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedUser as User;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role);
    
    if (error) {
      throw new Error(`Failed to get users by role: ${error.message}`);
    }
    
    return (data || []) as User[];
  }
  
  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Customer;
  }

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('userId', userId)
      .single();
    
    if (error || !data) return undefined;
    return data as Customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create customer: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Customer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer> {
    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedCustomer) {
      throw new Error(`Failed to update customer: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedCustomer as Customer;
  }
  
  // Order methods
  async getOrder(id: string): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('orderNumber', orderNumber)
      .single();
    
    if (error || !data) return undefined;
    return data as Order;
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customerId', customerId);
    
    if (error) {
      throw new Error(`Failed to get orders by customer: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async getOrdersBySalespersonId(salespersonId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('salespersonId', salespersonId);
    
    if (error) {
      throw new Error(`Failed to get orders by salesperson: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', status);
    
    if (error) {
      throw new Error(`Failed to get orders by status: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async getOrdersByStripeSessionId(stripeSessionId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('stripeSessionId', stripeSessionId);
    
    if (error) {
      throw new Error(`Failed to get orders by Stripe session: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create order: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order> {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedOrder) {
      throw new Error(`Failed to update order: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedOrder as Order;
  }
  
  // Order items methods
  async getOrderItem(id: string): Promise<OrderItem | undefined> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as OrderItem;
  }

  async getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get order items: ${error.message}`);
    }
    
    return (data || []) as OrderItem[];
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItem)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create order item: ${error?.message || 'Unknown error'}`);
    }
    
    return data as OrderItem;
  }

  async updateOrderItem(id: string, data: Partial<InsertOrderItem>): Promise<OrderItem> {
    const { data: updatedItem, error } = await supabase
      .from('order_items')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedItem) {
      throw new Error(`Failed to update order item: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedItem as OrderItem;
  }

  async deleteOrderItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete order item: ${error.message}`);
    }
  }
  
  // Design tasks methods
  async getDesignTask(id: string): Promise<DesignTask | undefined> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as DesignTask;
  }

  async getDesignTasksByOrderId(orderId: string): Promise<DesignTask[]> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get design tasks: ${error.message}`);
    }
    
    return (data || []) as DesignTask[];
  }

  async getDesignTasksByDesignerId(designerId: string): Promise<DesignTask[]> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*')
      .eq('designerId', designerId);
    
    if (error) {
      throw new Error(`Failed to get designer tasks: ${error.message}`);
    }
    
    return (data || []) as DesignTask[];
  }

  async getAllDesignTasks(): Promise<DesignTask[]> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*');
    
    if (error) {
      throw new Error(`Failed to get all design tasks: ${error.message}`);
    }
    
    return (data || []) as DesignTask[];
  }

  async createDesignTask(designTask: InsertDesignTask): Promise<DesignTask> {
    const { data, error } = await supabase
      .from('design_tasks')
      .insert(designTask)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create design task: ${error?.message || 'Unknown error'}`);
    }
    
    return data as DesignTask;
  }

  async updateDesignTask(id: string, data: Partial<InsertDesignTask>): Promise<DesignTask> {
    const { data: updatedTask, error } = await supabase
      .from('design_tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedTask) {
      throw new Error(`Failed to update design task: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedTask as DesignTask;
  }
  
  // Design files methods
  async getDesignFile(id: string): Promise<DesignFile | undefined> {
    const { data, error } = await supabase
      .from('design_files')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as DesignFile;
  }

  async getDesignFilesByTaskId(designTaskId: string): Promise<DesignFile[]> {
    const { data, error } = await supabase
      .from('design_files')
      .select('*')
      .eq('designTaskId', designTaskId);
    
    if (error) {
      throw new Error(`Failed to get design files: ${error.message}`);
    }
    
    return (data || []) as DesignFile[];
  }

  async createDesignFile(designFile: InsertDesignFile): Promise<DesignFile> {
    const { data, error } = await supabase
      .from('design_files')
      .insert(designFile)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create design file: ${error?.message || 'Unknown error'}`);
    }
    
    return data as DesignFile;
  }

  async deleteDesignFile(id: string): Promise<void> {
    const { error } = await supabase
      .from('design_files')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete design file: ${error.message}`);
    }
  }
  
  // Production tasks methods
  async getProductionTask(id: string): Promise<ProductionTask | undefined> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as ProductionTask;
  }

  async getProductionTasksByOrderId(orderId: string): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get production tasks: ${error.message}`);
    }
    
    return (data || []) as ProductionTask[];
  }

  async getProductionTasksByManufacturerId(manufacturerId: string): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('manufacturerId', manufacturerId);
    
    if (error) {
      throw new Error(`Failed to get manufacturer tasks: ${error.message}`);
    }
    
    return (data || []) as ProductionTask[];
  }

  async createProductionTask(productionTask: InsertProductionTask): Promise<ProductionTask> {
    const { data, error } = await supabase
      .from('production_tasks')
      .insert(productionTask)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create production task: ${error?.message || 'Unknown error'}`);
    }
    
    return data as ProductionTask;
  }

  async updateProductionTask(id: string, data: Partial<InsertProductionTask>): Promise<ProductionTask> {
    const { data: updatedTask, error } = await supabase
      .from('production_tasks')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedTask) {
      throw new Error(`Failed to update production task: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedTask as ProductionTask;
  }
  
  // Messages methods
  async getMessage(id: string): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Message;
  }

  async getMessagesBySenderId(senderId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('senderId', senderId);
    
    if (error) {
      throw new Error(`Failed to get sent messages: ${error.message}`);
    }
    
    return (data || []) as Message[];
  }

  async getMessagesByReceiverId(receiverId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiverId', receiverId);
    
    if (error) {
      throw new Error(`Failed to get received messages: ${error.message}`);
    }
    
    return (data || []) as Message[];
  }

  async getMessagesByOrderId(orderId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get order messages: ${error.message}`);
    }
    
    return (data || []) as Message[];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create message: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Message;
  }

  async markMessageAsRead(id: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        status: 'read',
        readAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to mark message as read: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Message;
  }

  async markMessageAsEmailSent(id: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ emailSent: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to mark message as email sent: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Message;
  }
  
  // Payments methods
  async getPayment(id: string): Promise<Payment | undefined> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Payment;
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get payments by order: ${error.message}`);
    }
    
    return (data || []) as Payment[];
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create payment: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Payment;
  }

  async updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment> {
    const { data: updatedPayment, error } = await supabase
      .from('payments')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !updatedPayment) {
      throw new Error(`Failed to update payment: ${error?.message || 'Unknown error'}`);
    }
    
    return updatedPayment as Payment;
  }
  
  // Stripe methods
  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ stripeCustomerId })
      .eq('id', userId)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to update Stripe customer ID: ${error?.message || 'Unknown error'}`);
    }
    
    return data as User;
  }
  
  // Additional methods for dashboard
  async getRecentOrders(limit: number): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to get recent orders: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async getOrderStatistics(): Promise<{status: string, count: number}[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('status')
      .order('status');
    
    if (error) {
      throw new Error(`Failed to get order statistics: ${error.message}`);
    }
    
    // Group by status and count
    const statusCounts: {[key: string]: number} = {};
    (data || []).forEach((order: any) => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });
    
    return Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
  }

  async getInventoryItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('itemName');
    
    if (error) {
      throw new Error(`Failed to get inventory items: ${error.message}`);
    }
    
    return data || [];
  }
}