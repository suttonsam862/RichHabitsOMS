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
import { hash, compare } from 'bcrypt';

/**
 * Supabase implementation of storage interface
 * This uses the Supabase JS SDK to communicate over HTTPS instead of direct PostgreSQL connections
 */
export class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await hash(userData.password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to create user: ${error?.message || 'Unknown error'}`);
    }
    
    return data as User;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    // Hash password if it's being updated
    if (data.password) {
      data.password = await hash(data.password, 10);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
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
      .from('users')
      .select('*')
      .eq('role', role);
    
    if (error) {
      throw new Error(`Failed to get users by role: ${error.message}`);
    }
    
    return (data || []) as User[];
  }
  
  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Customer;
  }

  async getCustomerByUserId(userId: number): Promise<Customer | undefined> {
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

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
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
  async getOrder(id: number): Promise<Order | undefined> {
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

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customerId', customerId);
    
    if (error) {
      throw new Error(`Failed to get orders by customer: ${error.message}`);
    }
    
    return (data || []) as Order[];
  }

  async getOrdersBySalespersonId(salespersonId: number): Promise<Order[]> {
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
    // Set timestamps if not provided
    if (!order.createdAt) {
      order.createdAt = new Date().toISOString();
    }
    if (!order.updatedAt) {
      order.updatedAt = new Date().toISOString();
    }

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

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    // Always update the updatedAt timestamp
    data.updatedAt = new Date().toISOString();

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
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as OrderItem;
  }

  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
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

  async updateOrderItem(id: number, data: Partial<InsertOrderItem>): Promise<OrderItem> {
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

  async deleteOrderItem(id: number): Promise<void> {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete order item: ${error.message}`);
    }
  }
  
  // Design tasks methods
  async getDesignTask(id: number): Promise<DesignTask | undefined> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as DesignTask;
  }

  async getDesignTasksByOrderId(orderId: number): Promise<DesignTask[]> {
    const { data, error } = await supabase
      .from('design_tasks')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get design tasks: ${error.message}`);
    }
    
    return (data || []) as DesignTask[];
  }

  async getDesignTasksByDesignerId(designerId: number): Promise<DesignTask[]> {
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
    // Set timestamps if not provided
    if (!designTask.createdAt) {
      designTask.createdAt = new Date().toISOString();
    }
    if (!designTask.updatedAt) {
      designTask.updatedAt = new Date().toISOString();
    }

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

  async updateDesignTask(id: number, data: Partial<InsertDesignTask>): Promise<DesignTask> {
    // Always update the updatedAt timestamp
    data.updatedAt = new Date().toISOString();

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
  async getDesignFile(id: number): Promise<DesignFile | undefined> {
    const { data, error } = await supabase
      .from('design_files')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as DesignFile;
  }

  async getDesignFilesByTaskId(designTaskId: number): Promise<DesignFile[]> {
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
    // Set timestamp if not provided
    if (!designFile.createdAt) {
      designFile.createdAt = new Date().toISOString();
    }

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

  async deleteDesignFile(id: number): Promise<void> {
    const { error } = await supabase
      .from('design_files')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete design file: ${error.message}`);
    }
  }
  
  // Production tasks methods
  async getProductionTask(id: number): Promise<ProductionTask | undefined> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as ProductionTask;
  }

  async getProductionTasksByOrderId(orderId: number): Promise<ProductionTask[]> {
    const { data, error } = await supabase
      .from('production_tasks')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get production tasks: ${error.message}`);
    }
    
    return (data || []) as ProductionTask[];
  }

  async getProductionTasksByManufacturerId(manufacturerId: number): Promise<ProductionTask[]> {
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
    // Set timestamps if not provided
    if (!productionTask.createdAt) {
      productionTask.createdAt = new Date().toISOString();
    }
    if (!productionTask.updatedAt) {
      productionTask.updatedAt = new Date().toISOString();
    }

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

  async updateProductionTask(id: number, data: Partial<InsertProductionTask>): Promise<ProductionTask> {
    // Always update the updatedAt timestamp
    data.updatedAt = new Date().toISOString();

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
  async getMessage(id: number): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Message;
  }

  async getMessagesBySenderId(senderId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('senderId', senderId);
    
    if (error) {
      throw new Error(`Failed to get sent messages: ${error.message}`);
    }
    
    return (data || []) as Message[];
  }

  async getMessagesByReceiverId(receiverId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiverId', receiverId);
    
    if (error) {
      throw new Error(`Failed to get received messages: ${error.message}`);
    }
    
    return (data || []) as Message[];
  }

  async getMessagesByOrderId(orderId: number): Promise<Message[]> {
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
    // Set timestamp if not provided
    if (!message.createdAt) {
      message.createdAt = new Date().toISOString();
    }

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

  async markMessageAsRead(id: number): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ readAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to mark message as read: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Message;
  }

  async markMessageAsEmailSent(id: number): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({ emailSent: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to mark message email as sent: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Message;
  }
  
  // Payments methods
  async getPayment(id: number): Promise<Payment | undefined> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Payment;
  }

  async getPaymentsByOrderId(orderId: number): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('orderId', orderId);
    
    if (error) {
      throw new Error(`Failed to get order payments: ${error.message}`);
    }
    
    return (data || []) as Payment[];
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // Set timestamps if not provided
    if (!payment.createdAt) {
      payment.createdAt = new Date().toISOString();
    }
    if (!payment.updatedAt) {
      payment.updatedAt = new Date().toISOString();
    }

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

  async updatePayment(id: number, data: Partial<InsertPayment>): Promise<Payment> {
    // Always update the updatedAt timestamp
    data.updatedAt = new Date().toISOString();

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
  async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
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
    // Using Supabase's SQL function to get counts by status
    const { data, error } = await supabase.rpc('get_order_statistics');
    
    if (error) {
      // Fallback implementation if RPC is not available
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('status');
      
      if (ordersError) {
        throw new Error(`Failed to get order statistics: ${ordersError.message}`);
      }
      
      // Manual calculation of counts
      const counts: Record<string, number> = {};
      orders?.forEach(order => {
        const status = order.status;
        counts[status] = (counts[status] || 0) + 1;
      });
      
      return Object.entries(counts).map(([status, count]) => ({ status, count }));
    }
    
    return data;
  }

  async getInventoryItems(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*');
    
    if (error) {
      throw new Error(`Failed to get inventory items: ${error.message}`);
    }
    
    return data || [];
  }

  // Additional methods for admin dashboard
  async getAllPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get all payments: ${error.message}`);
    }
    
    return (data || []) as Payment[];
  }

  async getAllCustomers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('createdAt', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get all customers: ${error.message}`);
    }
    
    return data || [];
  }

  async assignManufacturerToOrder(orderId: number, manufacturerId: number): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        manufacturerId,
        updatedAt: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to assign manufacturer: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Order;
  }

  async approveDesignTask(taskId: number): Promise<DesignTask> {
    const { data, error } = await supabase
      .from('design_tasks')
      .update({ 
        status: 'approved',
        updatedAt: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to approve design task: ${error?.message || 'Unknown error'}`);
    }
    
    return data as DesignTask;
  }

  async markOrderAsPaid(orderId: number): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error || !data) {
      throw new Error(`Failed to mark order as paid: ${error?.message || 'Unknown error'}`);
    }
    
    return data as Order;
  }
}