import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { configureAuth } from "./supabase-auth";
import { setupWebSocketServer, sendNotification } from "./messaging";
import { sendEmail, getOrderStatusChangeEmailTemplate, getPaymentReceiptEmailTemplate, getDesignApprovalEmailTemplate } from "./email";
import { requireAdmin } from "./middleware/adminAuth";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import { loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { supabase } from "./supabase";

// Setup Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
}) : undefined;

// Configure file uploads
const storage_dir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(storage_dir)) {
  fs.mkdirSync(storage_dir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, storage_dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedFileTypes = [
      '.pdf', '.ai', '.psd', '.eps', '.svg', '.png', '.jpg', '.jpeg'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only design files are allowed.') as any);
    }
  } 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure authentication
  const { isAuthenticated, hasRole } = configureAuth(app);
  
  // Health check endpoint for production monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: app.get('env'),
      version: process.env.npm_package_version || '1.0.0'
    });
  });
  
  // Admin Dashboard API with real data
  app.get("/api/admin/dashboard", isAuthenticated, async (req, res) => {
    try {
      // Ensure user is an admin
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      console.log("Fetching admin dashboard data with real data");
      
      // Get user counts from storage
      const customers = await storage.getUsersByRole('customer');
      const designers = await storage.getUsersByRole('designer');
      const manufacturers = await storage.getUsersByRole('manufacturer');
      const admins = await storage.getUsersByRole('admin');
      const salespeople = await storage.getUsersByRole('salesperson');
      
      const totalUsers = customers.length + designers.length + 
                         manufacturers.length + admins.length + 
                         salespeople.length;
      
      // Get orders by status
      const pendingDesign = await storage.getOrdersByStatus('pending_design');
      const designInProgress = await storage.getOrdersByStatus('design_in_progress');
      const designReview = await storage.getOrdersByStatus('design_review');
      const designApproved = await storage.getOrdersByStatus('design_approved');
      const pendingProduction = await storage.getOrdersByStatus('pending_production');
      const inProduction = await storage.getOrdersByStatus('in_production');
      const completed = await storage.getOrdersByStatus('completed');
      const cancelled = await storage.getOrdersByStatus('cancelled');
      const drafts = await storage.getOrdersByStatus('draft');
      
      const totalOrders = pendingDesign.length + designInProgress.length + 
                          designReview.length + designApproved.length + 
                          pendingProduction.length + inProduction.length + 
                          completed.length + cancelled.length + drafts.length;
      
      const activeOrders = pendingDesign.length + designInProgress.length + 
                           designReview.length + designApproved.length + 
                           pendingProduction.length + inProduction.length;
      
      // Get design tasks status count
      const allDesignTasks = await storage.getAllDesignTasks();
      const incompleteDesignTasks = allDesignTasks.filter(task => 
        !['completed', 'cancelled'].includes(task.status)
      ).length;
      
      // Get revenue from payments
      const allPayments = await storage.getAllPayments();
      const totalRevenue = allPayments
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      // Get recent orders with customer info
      const recentOrders = await storage.getRecentOrders(5);
      const recentOrdersWithCustomer = [];
      
      // Add customer names to orders
      for (const order of recentOrders) {
        const customer = await storage.getCustomer(order.customerId);
        const customerUser = customer ? await storage.getUser(customer.userId) : null;
        
        recentOrdersWithCustomer.push({
          ...order,
          customerName: customerUser ? 
            `${customerUser.firstName || ''} ${customerUser.lastName || ''}`.trim() || customerUser.username : 
            'Unknown'
        });
      }
      
      // Calculate order statistics
      const ordersByStatus = [
        { status: 'draft', count: drafts.length },
        { status: 'pending_design', count: pendingDesign.length },
        { status: 'design_in_progress', count: designInProgress.length },
        { status: 'design_review', count: designReview.length },
        { status: 'design_approved', count: designApproved.length },
        { status: 'pending_production', count: pendingProduction.length },
        { status: 'in_production', count: inProduction.length },
        { status: 'completed', count: completed.length },
        { status: 'cancelled', count: cancelled.length }
      ];
      
      // Calculate monthly revenue for the past 6 months from real payment data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Initialize revenue by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueByMonth = {};
      
      // Get the last 6 months
      const last6Months = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = monthNames[d.getMonth()];
        last6Months.unshift(monthName);
        revenueByMonth[monthName] = 0; // Initialize with zero
      }
      
      // Group completed payments by month
      for (const payment of allPayments) {
        if (payment.status === 'completed' && payment.createdAt) {
          const paymentDate = new Date(payment.createdAt);
          if (paymentDate >= sixMonthsAgo) {
            const month = monthNames[paymentDate.getMonth()];
            revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(payment.amount);
          }
        }
      }
      
      // Format for chart - ensure we only show the last 6 months in order
      const monthlyRevenue = last6Months.map(month => ({
        month,
        revenue: revenueByMonth[month] || 0
      }));
      
      // Return dashboard data
      res.json({
        stats: {
          totalUsers,
          totalOrders,
          activeOrders,
          designTasks: incompleteDesignTasks,
          totalRevenue
        },
        ordersByStatus,
        monthlyRevenue,
        recentOrders: recentOrdersWithCustomer
      });
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  // Stripe payment endpoint for orders
  app.post("/api/orders/:orderId/checkout", async (req, res, next) => {
    // First check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Continue with checkout processing
    try {
      const orderId = parseInt(req.params.orderId);
      
      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Make sure order has a total amount
      if (!order.totalAmount) {
        return res.status(400).json({ message: "Order has no total amount" });
      }
      
      // If order is already paid, return error
      const existingPayments = await storage.getPaymentsByOrderId(orderId);
      const completedPayments = existingPayments.filter(p => p.status === 'completed');
      if (completedPayments.length > 0) {
        return res.status(400).json({ message: "Order is already paid" });
      }
      
      // If Stripe is not configured, return error
      if (!stripe) {
        return res.status(501).json({ message: "Payment processing is not configured" });
      }
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Order #${order.orderNumber}`,
                description: 'Custom clothing order',
              },
              unit_amount: Math.round(Number(order.totalAmount) * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
        metadata: {
          orderId: order.id.toString(),
          orderNumber: order.orderNumber,
        },
      });
      
      // Create payment record
      await storage.createPayment({
        orderId: order.id,
        amount: order.totalAmount.toString(),
        status: 'pending',
        stripePaymentId: session.id,
        stripeClientSecret: session.payment_intent as string,
        transactionId: null,
        notes: 'Payment session created',
        method: 'credit_card'
      });
      
      // Return session ID to client
      res.json({ 
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Error processing payment" });
    }
  });
  
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      // Input validation
      if (!req.body.email || !req.body.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }

      const { email, password } = req.body;
      
      // Authenticate directly with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Supabase Auth login error:', error);
        return res.status(401).json({ 
          success: false, 
          message: error.message || 'Invalid email or password'
        });
      }
      
      if (!data.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found'
        });
      }
      
      // Get user metadata
      const userData = data.user.user_metadata as {
        role: 'admin' | 'salesperson' | 'designer' | 'manufacturer' | 'customer';
        username?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        company?: string;
      };
      
      // Create session user object
      const sessionUser = {
        id: data.user.id,
        email: data.user.email,
        role: userData.role || 'customer', // Default to customer if no role specified
        username: userData.username || data.user.email?.split('@')[0] || 'user',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        company: userData.company || null,
        createdAt: new Date(data.user.created_at || new Date()).toISOString(),
        stripeCustomerId: null
      };
      
      // Add to session
      req.session.user = sessionUser;
      
      // Return success response with user data and token
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: sessionUser,
        session: {
          token: data.session?.access_token,
          expires: data.session?.expires_at
        }
      });
    } catch (err) {
      console.error('Unexpected login error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Unexpected error during login process'
      });
    }
  });
  
  app.post('/api/register', async (req, res) => {
    try {
      const { email, username, password, firstName, lastName, phone, company } = req.body;
      
      // Check if user already exists in Supabase Auth
      const { data: checkData } = await supabase.auth.signInWithPassword({
        email,
        password: password + '_check' // Use invalid password to just check if email exists
      });
      
      if (checkData?.user) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            firstName,
            lastName,
            role: 'customer', // Force customer role for new registrations
            phone,
            company
          }
        }
      });
      
      if (error) {
        console.error('Supabase Auth signup error:', error);
        return res.status(400).json({ 
          message: 'Error creating account',
          details: error.message
        });
      }
      
      if (!data.user) {
        return res.status(500).json({ message: 'Error creating user account' });
      }
      
      // Create session user
      const sessionUser = {
        id: data.user.id,
        email: data.user.email,
        role: 'customer',
        username: username || data.user.email?.split('@')[0] || 'user',
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        company: company || null,
        createdAt: new Date(data.user.created_at || new Date()).toISOString()
      };
      
      // Store in session
      req.session.user = sessionUser;
      
      // Return user info
      return res.json({
        success: true,
        message: 'Registration successful',
        user: sessionUser,
        session: {
          token: data.session?.access_token,
          expires: data.session?.expires_at
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ 
        message: 'Error during registration process',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  app.get('/api/logout', async (req, res) => {
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
      
      // Clear session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ message: 'Error during logout process' });
    }
  });
  
  app.get('/api/auth/me', (req, res) => {
    // Check if user is in session
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Return user info from session
    res.json(req.session.user);
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocketServer(httpServer);
  
  return httpServer;
}