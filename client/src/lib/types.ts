// Define common types used across dashboard components

// Stats for different dashboards
export interface AdminDashboardStats {
  totalUsers: number;
  activeOrders: number;
  designTasks: number;
  totalRevenue: number;
}

export interface SalespersonDashboardStats {
  totalOrders: number;
  activeCustomers: number;
  monthlySales: number;
}

export interface DesignerDashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
}

export interface ManufacturerDashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
}

export interface CustomerDashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
}

// Order-related types
export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  itemCount?: number;
}

// Task-related types
export interface DesignTask {
  id: number;
  orderNumber: string;
  orderId: number;
  description: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  progress?: number;
}

export interface ProductionTask {
  id: number;
  orderNumber: string;
  orderId: number;
  description: string;
  status: string;
  quantity: number;
  dueDate?: string;
  startDate?: string;
  progress?: number;
}

// Message-related types
export interface MessageSummary {
  id: number;
  senderName: string;
  content: string;
  createdAt: string;
  orderId?: number;
  orderNumber?: string;
  readAt?: string;
}

// Dashboard data types
export interface AdminDashboardData {
  stats: AdminDashboardStats;
  ordersByStatus: Array<{ status: string; count: number }>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  recentOrders: OrderSummary[];
}

export interface SalespersonDashboardData {
  stats: SalespersonDashboardStats;
  recentOrders: OrderSummary[];
  pendingTasks: Array<any>; // Tasks requiring salesperson action
}

export interface DesignerDashboardData {
  stats: DesignerDashboardStats;
  activeTasks: DesignTask[];
  completedTasks: DesignTask[];
}

export interface ManufacturerDashboardData {
  stats: ManufacturerDashboardStats;
  activeTasks: ProductionTask[];
  pendingTasks: ProductionTask[];
}

export interface CustomerDashboardData {
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  metrics: {
    totalOrders: number;
    activeOrders: number;
    designsNeedingApproval: number;
    totalSpent: string;
  };
  orderStatusCounts: Record<string, number>;
  recentOrders: OrderSummary[];
  recentMessages: MessageSummary[];
}