import { Request, Response, Router } from "express";
import { storage } from "../../storage";

const router = Router();

// Admin dashboard metrics API - real data
router.get("/dashboard-metrics", async (req: Request, res: Response) => {
  try {
    // Ensure user is an admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Get real data counts
    const customers = await storage.getUsersByRole('customer');
    const designers = await storage.getUsersByRole('designer');
    const manufacturers = await storage.getUsersByRole('manufacturer');
    const admins = await storage.getUsersByRole('admin');
    const salespeople = await storage.getUsersByRole('salesperson');
    
    const totalUsers = customers.length + designers.length + manufacturers.length + 
                       admins.length + salespeople.length;
    
    // Get active orders
    const pendingDesign = await storage.getOrdersByStatus('pending_design');
    const designInProgress = await storage.getOrdersByStatus('design_in_progress');
    const designReview = await storage.getOrdersByStatus('design_review');
    const designApproved = await storage.getOrdersByStatus('design_approved');
    const pendingProduction = await storage.getOrdersByStatus('pending_production');
    const inProduction = await storage.getOrdersByStatus('in_production');
    
    const activeOrders = pendingDesign.length + designInProgress.length + 
                         designReview.length + designApproved.length + 
                         pendingProduction.length + inProduction.length;
    
    // Count incomplete design tasks
    const allDesignTasks = await storage.getAllDesignTasks();
    const incompleteDesignTasks = allDesignTasks.filter(task => 
      !['completed', 'cancelled'].includes(task.status)
    ).length;
    
    // Calculate revenue from payments
    const allPayments = await storage.getAllPayments();
    const totalRevenue = allPayments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    
    // Get order stats by status
    const orderStats = await storage.getOrderStatistics();
    
    // Return dashboard metrics
    res.json({
      stats: {
        totalUsers,
        activeOrders,
        designTasks: incompleteDesignTasks,
        totalRevenue
      },
      ordersByStatus: orderStats
    });
  } catch (error) {
    console.error('Error fetching admin dashboard metrics:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
  }
});

// Recent orders endpoint
router.get('/recent-orders', async (req: Request, res: Response) => {
  try {
    // Ensure user is an admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Get recent orders
    const recentOrders = await storage.getRecentOrders(5);
    const formattedOrders = [];
    
    // Format orders with customer info
    for (const order of recentOrders) {
      const customer = await storage.getCustomer(order.customerId);
      const customerUser = customer ? await storage.getUser(customer.userId) : null;
      
      formattedOrders.push({
        ...order,
        customerName: customerUser ? 
          `${customerUser.firstName || ''} ${customerUser.lastName || ''}`.trim() || customerUser.username : 
          'Unknown'
      });
    }
    
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ message: 'Failed to fetch recent orders' });
  }
});

// Admin messages endpoint
router.get('/messages', async (req: Request, res: Response) => {
  try {
    // Ensure user is an admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    
    // Get messages for this admin
    const userMessages = [];
    const sentMessages = await storage.getMessagesBySenderId(req.user.id);
    const receivedMessages = await storage.getMessagesByReceiverId(req.user.id);
    userMessages.push(...sentMessages, ...receivedMessages);
    
    // Sort by date and take most recent
    userMessages.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const formattedMessages = [];
    for (const message of userMessages.slice(0, 5)) {
      const sender = await storage.getUser(message.senderId);
      let orderNumber = null;
      
      if (message.orderId) {
        const order = await storage.getOrder(message.orderId);
        orderNumber = order ? order.orderNumber : null;
      }
      
      formattedMessages.push({
        id: message.id,
        senderName: sender ? 
          `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.username : 
          'Unknown',
        content: message.content,
        createdAt: message.createdAt,
        orderId: message.orderId,
        orderNumber
      });
    }
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

export default router;