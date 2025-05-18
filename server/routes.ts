import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { configureAuth } from "./auth";
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
import passport from "passport";

// Setup Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
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
  // Health check endpoint for production monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: app.get('env'),
      version: process.env.npm_package_version || '1.0.0'
    });
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
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if order is already paid
      if (order.isPaid) {
        return res.status(400).json({ message: "Order has already been paid" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItemsByOrderId(orderId);
      
      if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: "Order has no items to pay for" });
      }
      
      // Get customer details
      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }
      
      const customerUser = await storage.getUser(customer.userId);
      if (!customerUser) {
        return res.status(400).json({ message: "Customer user not found" });
      }
      
      // Make sure stripe is initialized
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }
      
      // Create Stripe line items from order items
      const lineItems = orderItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productName,
            description: item.description || undefined
          },
          unit_amount: Math.round(parseFloat(item.unitPrice.toString()) * 100), // Convert to cents
        },
        quantity: item.quantity,
      }));
      
      // Add tax as a separate line item if applicable
      if (order.tax && parseFloat(order.tax.toString()) > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Tax',
              description: 'Sales tax'
            },
            unit_amount: Math.round(parseFloat(order.tax.toString()) * 100), // Convert to cents
          },
          quantity: 1,
        });
      }
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel?order_id=${orderId}`,
        client_reference_id: order.id.toString(),
        customer_email: customerUser.email,
        metadata: {
          orderId: order.id.toString(),
          orderNumber: order.orderNumber
        }
      });
      
      // Update order with Stripe session ID
      await storage.updateOrder(orderId, {
        stripeSessionId: session.id
      });
      
      // Return the session ID and URL to the client
      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      console.error('Stripe payment error:', error);
      next(error);
    }
  });
  
  // Endpoint to verify payment session
  app.get("/api/payment-verify", async (req, res, next) => {
    try {
      const sessionId = req.query.session_id as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Missing session ID" });
      }
      
      // Make sure stripe is initialized
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }
      
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Find the order with this session ID
      const orders = await storage.getOrdersByStripeSessionId(sessionId);
      
      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "No order found with this session ID" });
      }
      
      const order = orders[0];
      
      // If not yet marked as paid and payment is complete, update the order
      if (!order.isPaid && session.payment_status === 'paid') {
        await storage.updateOrder(order.id, {
          isPaid: true,
          paymentDate: new Date()
        });
        
        // Create payment record if it doesn't exist
        const payments = await storage.getPaymentsByOrderId(order.id);
        if (!payments || payments.length === 0) {
          await storage.createPayment({
            orderId: order.id,
            amount: order.totalAmount,
            status: 'completed',
            method: 'credit_card',
            transactionId: session.payment_intent as string,
            notes: `Stripe payment completed for order #${order.orderNumber}`
          });
        }
      }
      
      // Return order details
      res.json({
        orderNumber: order.orderNumber,
        orderId: order.id,
        isPaid: order.isPaid || (session.payment_status === 'paid')
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      next(error);
    }
  });
  
  // Stripe webhook needs raw body, so add this middleware before Express bodyParser
  app.post("/api/stripe-webhook", express.raw({ type: 'application/json' }), async (req: any, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    try {
      // Verify the event came from Stripe
      // In production, you should use a webhook secret
      // const endpointSecret = 'your_webhook_secret';
      // event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
      
      // For testing purposes, we'll just parse the payload
      event = JSON.parse(payload.toString());
      
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Get order ID from metadata
      const orderId = session.metadata?.orderId;
      
      if (orderId) {
        try {
          const order = await storage.getOrder(parseInt(orderId));
          
          if (order && order.stripeSessionId === session.id) {
            // Update order as paid
            await storage.updateOrder(parseInt(orderId), {
              isPaid: true,
              paymentDate: new Date()
            });
            
            // Create payment record
            await storage.createPayment({
              orderId: parseInt(orderId),
              amount: order.totalAmount,
              status: 'completed',
              method: 'credit_card',
              transactionId: session.payment_intent,
              notes: `Stripe payment completed for order #${order.orderNumber}`
            });
            
            // Send email notification
            const customer = await storage.getCustomer(order.customerId);
            if (customer) {
              const customerUser = await storage.getUser(customer.userId);
              if (customerUser) {
                // Send notification via WebSocket if available
                sendNotification(customer.userId, {
                  type: 'payment_completed',
                  order
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing webhook payment:', error);
        }
      }
    }
    
    res.status(200).end();
  });
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocketServer(httpServer);
  
  // Configure authentication
  const { isAuthenticated, hasRole } = configureAuth(app);
  
  // Admin customer management routes
  app.get("/api/admin/customers", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const customers = await storage.getUsersByRole('customer');
      const result = [];
      
      for (const user of customers) {
        const customer = await storage.getCustomerByUserId(user.id);
        if (customer) {
          result.push({
            id: customer.id,
            userId: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email,
            phone: user.phone || "",
            company: user.company || "",
            createdAt: user.createdAt,
            metadata: customer
          });
        } else {
          // Include users who are customers but don't have a customer profile yet
          result.push({
            userId: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email,
            phone: user.phone || "",
            company: user.company || "", 
            createdAt: user.createdAt,
            metadata: null
          });
        }
      }
      
      return res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Customer routes
  app.get("/api/customers", isAuthenticated, hasRole(["admin", "salesperson"]), async (req, res, next) => {
    try {
      const customers = await storage.getUsersByRole('customer');
      const result = [];
      
      for (const user of customers) {
        const customer = await storage.getCustomerByUserId(user.id);
        if (customer) {
          result.push({
            id: customer.id,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            }
          });
        }
      }
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Admin customer routes
  app.post("/api/admin/customers", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const { firstName, lastName, email, phone, company, address, city, state, zip, country } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: "A user with this email already exists" });
      }
      
      // Generate a username from the email
      const username = email.split('@')[0] + Math.floor(Math.random() * 100);
      
      // Generate a temporary random password (this will be reset by the user)
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
      
      // Create the user with customer role
      const user = await storage.createUser({
        email,
        username,
        password: tempPassword, // This will be replaced when user sets up their account
        firstName,
        lastName,
        role: 'customer',
        phone,
        company
      });
      
      // Create the customer record
      const customer = await storage.createCustomer({
        userId: user.id,
        address: address || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
        country: country || '',
      });
      
      // Import onboarding functions
      const { generateSetupToken, sendWelcomeEmail } = require('./onboarding');
      
      // Generate setup token
      const setupToken = await generateSetupToken(user.id);
      
      // Send welcome email with setup link
      const name = firstName || 'Customer';
      await sendWelcomeEmail(email, name, setupToken);
      
      res.status(201).json({ 
        success: true,
        customer: {
          id: customer.id,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        }
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      next(error);
    }
  });
  
  // Error handling for validation
  const validateRequest = (schema: z.ZodType<any, any>) => (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  };
  
  // Auth routes
  app.post("/api/auth/login", validateRequest(loginSchema), (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/register", validateRequest(registerSchema), async (req, res, next) => {
    try {
      const { confirmPassword, ...userData } = req.body;
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already in use" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Create customer record if role is customer
      if (user.role === 'customer') {
        await storage.createCustomer({
          userId: user.id,
          address: '',
          city: '',
          state: '',
          zip: '',
          country: '',
        });
      }
      
      // Log in the user
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Account setup routes
  app.post("/api/auth/verify-setup-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }
      
      // Import onboarding functions
      const { verifySetupToken } = require('./onboarding');
      
      // Verify token
      const userId = await verifySetupToken(token);
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired token. Please contact support for assistance." 
        });
      }
      
      // Get user information
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        } 
      });
    } catch (error) {
      console.error('Error verifying setup token:', error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while verifying your setup token" 
      });
    }
  });
  
  app.post("/api/auth/complete-setup", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Token and password are required" 
        });
      }
      
      if (password !== confirmPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Passwords do not match" 
        });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: "Password must be at least 8 characters long" 
        });
      }
      
      // Import onboarding functions
      const { verifySetupToken, completeSetup } = require('./onboarding');
      
      // Verify token
      const userId = await verifySetupToken(token);
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired token. Please contact support for assistance." 
        });
      }
      
      // Complete the setup
      const success = await completeSetup(userId, password);
      
      if (!success) {
        return res.status(500).json({ 
          success: false, 
          message: "An error occurred while setting up your account" 
        });
      }
      
      res.json({ 
        success: true, 
        message: "Your account has been set up successfully. You can now log in." 
      });
    } catch (error) {
      console.error('Error completing setup:', error);
      res.status(500).json({ 
        success: false, 
        message: "An error occurred while setting up your account" 
      });
    }
  });
  
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  });
  
  // Customer Dashboard API
  app.get("/api/customer/dashboard", isAuthenticated, async (req, res, next) => {
    try {
      // Ensure user is a customer
      if (req.user.role !== 'customer') {
        return res.status(403).json({ message: "Access denied. Customer role required." });
      }
      
      // Get customer record
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer record not found" });
      }
      
      // Get customer orders
      const orders = await storage.getOrdersByCustomerId(customer.id);
      
      // Get customer messages
      const sentMessages = await storage.getMessagesBySenderId(req.user.id);
      const receivedMessages = await storage.getMessagesByReceiverId(req.user.id);
      const messages = [...sentMessages, ...receivedMessages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 5); // Get only most recent 5 messages
      
      // Calculate dashboard metrics
      const activeOrders = orders.filter(order => 
        order.status !== 'completed' && order.status !== 'cancelled'
      );
      
      const designsNeedingApproval = orders.filter(order => 
        order.status === 'design_review'
      );
      
      const totalSpent = orders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalAmount || '0') || 0);
      }, 0).toFixed(2);
      
      // Get order status counts
      const orderStatusCounts = {};
      orders.forEach(order => {
        const status = order.status || 'unknown';
        if (orderStatusCounts[status]) {
          orderStatusCounts[status]++;
        } else {
          orderStatusCounts[status] = 1;
        }
      });
      
      // Return dashboard data
      res.json({
        customer: {
          id: customer.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email
        },
        metrics: {
          totalOrders: orders.length,
          activeOrders: activeOrders.length,
          designsNeedingApproval: designsNeedingApproval.length,
          totalSpent
        },
        orderStatusCounts,
        recentOrders: orders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5),
        recentMessages: messages
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Customer Orders API
  app.get("/api/customer/orders", isAuthenticated, async (req, res, next) => {
    try {
      // Ensure user is a customer
      if (req.user.role !== 'customer') {
        return res.status(403).json({ message: "Access denied. Customer role required." });
      }
      
      // Get customer record
      const customer = await storage.getCustomerByUserId(req.user.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer record not found" });
      }
      
      // Get customer orders
      const orders = await storage.getOrdersByCustomerId(customer.id);
      
      // Return all customer orders with basic information
      res.json(orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      })));
    } catch (error) {
      next(error);
    }
  });
  
  // Customer Messages API
  app.get("/api/customer/messages", isAuthenticated, async (req, res, next) => {
    try {
      // Ensure user is a customer
      if (req.user.role !== 'customer') {
        return res.status(403).json({ message: "Access denied. Customer role required." });
      }
      
      // Get customer's messages
      const sentMessages = await storage.getMessagesBySenderId(req.user.id);
      const receivedMessages = await storage.getMessagesByReceiverId(req.user.id);
      const messages = [...sentMessages, ...receivedMessages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Return all customer messages
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });
  
  // Send Customer Message API
  app.post("/api/customer/messages", isAuthenticated, async (req, res, next) => {
    try {
      // Ensure user is a customer
      if (req.user.role !== 'customer') {
        return res.status(403).json({ message: "Access denied. Customer role required." });
      }
      
      const { receiverId, orderId, content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // If an orderId is provided, verify the customer has access to this order
      if (orderId) {
        const order = await storage.getOrder(orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        // Get customer record
        const customer = await storage.getCustomerByUserId(req.user.id);
        if (!customer || order.customerId !== customer.id) {
          return res.status(403).json({ message: "You don't have permission to access this order" });
        }
      }
      
      // Create the message
      const message = await storage.createMessage({
        senderId: req.user.id,
        receiverId,
        orderId,
        content,
        senderName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username,
        status: 'unread'
      });
      
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  });
  
  // User routes
  app.get("/api/users", isAuthenticated, hasRole(["admin"]), async (req, res, next) => {
    try {
      const role = req.query.role as string;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role);
      } else {
        // Would need to implement a method to get all users with pagination
        users = [];
      }
      
      res.json(users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      })));
    } catch (error) {
      next(error);
    }
  });
  
  // Admin Customer Management
  app.get("/api/admin/customers", requireAdmin, async (req, res, next) => {
    try {
      // Get all users with role "customer"
      const customerUsers = await storage.getUsersByRole("customer");
      
      // Format and return customer data
      const customers = customerUsers.map(user => ({
        userId: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        phone: user.phone || '',
        company: user.company || '',
        createdAt: user.createdAt,
        metadata: null
      }));
      
      res.json(customers);
    } catch (error) {
      next(error);
    }
  });
  
  // Order routes
  app.get("/api/orders", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      let orders;
      
      if (user.role === 'admin') {
        const status = req.query.status as string;
        if (status) {
          orders = await storage.getOrdersByStatus(status);
        } else {
          orders = await storage.getRecentOrders(50);
        }
      } else if (user.role === 'salesperson') {
        orders = await storage.getOrdersBySalespersonId(user.id);
      } else if (user.role === 'customer') {
        const customer = await storage.getCustomerByUserId(user.id);
        if (customer) {
          orders = await storage.getOrdersByCustomerId(customer.id);
        } else {
          orders = [];
        }
      } else if (user.role === 'designer' || user.role === 'manufacturer') {
        // Implement logic to get orders assigned to this designer/manufacturer
        orders = [];
      }
      
      res.json(orders || []);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/orders/:id", isAuthenticated, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Customer role security check - customers can only access their own orders
      if (req.user.role === 'customer') {
        const customer = await storage.getCustomerByUserId(req.user.id);
        if (!customer || order.customerId !== customer.id) {
          return res.status(403).json({ message: "You don't have permission to access this order" });
        }
      }
      
      // Get order items
      const items = await storage.getOrderItemsByOrderId(orderId);
      
      // Get design tasks
      const designTasks = await storage.getDesignTasksByOrderId(orderId);
      
      // Get production tasks
      const productionTasks = await storage.getProductionTasksByOrderId(orderId);
      
      res.json({
        ...order,
        items,
        designTasks,
        productionTasks,
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/orders", isAuthenticated, hasRole(["admin", "salesperson"]), async (req, res, next) => {
    try {
      const { items, ...orderData } = req.body;
      
      // Create order
      const order = await storage.createOrder({
        ...orderData,
        salespersonId: req.user.id,
      });
      
      // Create order items
      const createdItems = [];
      for (const item of items) {
        const orderItem = await storage.createOrderItem({
          ...item,
          orderId: order.id,
        });
        createdItems.push(orderItem);
      }
      
      // Recalculate order total
      let totalAmount = 0;
      for (const item of createdItems) {
        totalAmount += parseFloat(item.totalPrice.toString());
      }
      
      const tax = totalAmount * 0.08; // 8% tax
      
      // Update order with total
      const updatedOrder = await storage.updateOrder(order.id, {
        totalAmount: totalAmount.toString(),
        tax: tax.toString(),
      });
      
      res.status(201).json({
        ...updatedOrder,
        items: createdItems,
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/orders/:id", isAuthenticated, hasRole(["admin", "salesperson"]), async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const { items, ...orderData } = req.body;
      
      // Update order
      const order = await storage.updateOrder(orderId, orderData);
      
      // Handle items if provided
      if (items) {
        // Get existing items
        const existingItems = await storage.getOrderItemsByOrderId(orderId);
        
        // Process items
        for (const item of items) {
          if (item.id) {
            // Update existing item
            await storage.updateOrderItem(item.id, item);
          } else {
            // Create new item
            await storage.createOrderItem({
              ...item,
              orderId,
            });
          }
        }
        
        // Remove items not in the new list
        for (const existingItem of existingItems) {
          if (!items.some(i => i.id === existingItem.id)) {
            await storage.deleteOrderItem(existingItem.id);
          }
        }
        
        // Recalculate total
        const updatedItems = await storage.getOrderItemsByOrderId(orderId);
        let totalAmount = 0;
        for (const item of updatedItems) {
          totalAmount += parseFloat(item.totalPrice.toString());
        }
        
        const tax = totalAmount * 0.08; // 8% tax
        
        // Update order with total
        await storage.updateOrder(orderId, {
          totalAmount: totalAmount.toString(),
          tax: tax.toString(),
        });
      }
      
      // Get updated order with items
      const updatedOrder = await storage.getOrder(orderId);
      const updatedItems = await storage.getOrderItemsByOrderId(orderId);
      
      res.json({
        ...updatedOrder,
        items: updatedItems,
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Design task routes
  app.get("/api/design-tasks", isAuthenticated, hasRole(["admin", "designer"]), async (req, res, next) => {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      let tasks = [];
      
      if (role === 'admin') {
        // Admin can see all design tasks
        const allTasks = await storage.getAllDesignTasks();
        tasks = allTasks;
      } else if (role === 'designer') {
        // Designer only sees their tasks
        const designerTasks = await storage.getDesignTasksByDesignerId(userId);
        tasks = designerTasks;
      }
      
      // Enrich with order data and files
      const enrichedTasks = await Promise.all(tasks.map(async (task) => {
        const order = await storage.getOrder(task.orderId);
        const files = await storage.getDesignFilesByTaskId(task.id);
        
        return {
          ...task,
          order: order ? {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status
          } : null,
          files: files || []
        };
      }));
      
      res.json(enrichedTasks);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/design-tasks", isAuthenticated, hasRole(["admin"]), async (req, res, next) => {
    try {
      const taskData = req.body;
      
      // Create design task
      const task = await storage.createDesignTask(taskData);
      
      // Notify designer if assigned
      if (task.designerId) {
        sendNotification(task.designerId, {
          type: 'new_design_task',
          task,
        });
      }
      
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/design-tasks/:id", isAuthenticated, hasRole(["admin", "designer", "customer"]), async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskData = req.body;
      const userId = req.user.id;
      const role = req.user.role;
      
      // Get existing task
      const task = await storage.getDesignTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Design task not found" });
      }
      
      // Validate permissions based on role and status change
      if (role === 'designer') {
        // Designers can only update their own tasks
        if (task.designerId !== userId) {
          return res.status(403).json({ message: "You can only update your own design tasks" });
        }
        
        // Designers can only change status to submitted
        if (taskData.status && taskData.status !== 'submitted') {
          return res.status(403).json({ message: "Designers can only submit designs, not approve or reject them" });
        }
      } else if (role === 'customer') {
        // Customers can only approve or reject designs of their own orders
        const order = await storage.getOrder(task.orderId);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        const customer = await storage.getCustomerByUserId(userId);
        if (!customer || order.customerId !== customer.id) {
          return res.status(403).json({ message: "You can only update design tasks for your own orders" });
        }
        
        // Customers can only approve or reject submitted designs
        if (task.status !== 'submitted') {
          return res.status(400).json({ message: "You can only approve or reject submitted designs" });
        }
        
        if (taskData.status !== 'approved' && taskData.status !== 'rejected') {
          return res.status(400).json({ message: "Customers can only approve or reject designs" });
        }
      } else if (role !== 'admin') {
        return res.status(403).json({ message: "You don't have permission to update this task" });
      }
      
      // Only admins can assign designer
      if (role !== 'admin') {
        delete taskData.designerId;
      }
      
      // Update task
      const updatedTask = await storage.updateDesignTask(taskId, taskData);
      
      // Handle status changes and notifications
      if (taskData.status) {
        // Get the order
        const order = await storage.getOrder(task.orderId);
        
        if (taskData.status === 'submitted') {
          // Notify admin and customer
          const admins = await storage.getUsersByRole('admin');
          for (const admin of admins) {
            sendNotification(admin.id, {
              type: 'design_submitted',
              task: updatedTask,
              order: order ? {
                id: order.id,
                orderNumber: order.orderNumber
              } : null
            });
          }
          
          // Notify salesperson
          if (order && order.salespersonId) {
            sendNotification(order.salespersonId, {
              type: 'design_submitted',
              task: updatedTask,
              order: {
                id: order.id,
                orderNumber: order.orderNumber
              }
            });
          }
          
          // Notify customer
          if (order) {
            const customer = await storage.getCustomer(order.customerId);
            if (customer) {
              sendNotification(customer.userId, {
                type: 'design_submitted',
                task: updatedTask,
                order: {
                  id: order.id,
                  orderNumber: order.orderNumber
                },
                message: 'A new design is ready for your review'
              });
            }
          }
        } else if (taskData.status === 'approved') {
          // Notify the designer
          if (task.designerId) {
            sendNotification(task.designerId, {
              type: 'design_approved',
              task: updatedTask,
              message: 'Your design has been approved!'
            });
          }
          
          // Update order status if needed
          if (order && order.status === 'design_review') {
            await storage.updateOrder(order.id, {
              status: 'design_approved'
            });
          }
        } else if (taskData.status === 'rejected') {
          // Notify the designer
          if (task.designerId) {
            sendNotification(task.designerId, {
              type: 'design_rejected',
              task: updatedTask,
              notes: taskData.notes,
              message: 'Your design needs revisions'
            });
          }
        }
      }
      
      // Fetch updated task with all details
      const enrichedTask = {
        ...updatedTask,
        files: await storage.getDesignFilesByTaskId(taskId),
        order: null
      };
      
      // Get order details
      const order = await storage.getOrder(task.orderId);
      if (order) {
        enrichedTask.order = {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status
        };
      }
      
      res.json(enrichedTask);
    } catch (error) {
      next(error);
    }
  });
  
  // Design file routes
  app.post("/api/design-tasks/:taskId/upload", isAuthenticated, hasRole(["admin", "designer"]), upload.single('file'), async (req, res, next) => {
    try {
      const { uploadDesignFile } = require('./design');
      const taskId = parseInt(req.params.taskId);
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Check if task exists and designer is authorized
      const task = await storage.getDesignTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Design task not found" });
      }
      
      // Verify permissions (only assigned designer or admin)
      if (req.user.role !== 'admin' && task.designerId !== userId) {
        return res.status(403).json({ message: "You are not authorized to upload files for this task" });
      }
      
      // Process uploaded file
      const filename = req.file.originalname;
      const fileType = req.file.mimetype;
      const filePath = `/uploads/${req.file.filename}`;
      const notes = req.body.notes;
      
      // Upload file and update task status
      const result = await uploadDesignFile(taskId, userId, filename, fileType, filePath, notes);
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Design file routes (legacy endpoint maintained for backwards compatibility)
  app.post("/api/design-files", isAuthenticated, hasRole(["admin", "designer"]), upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { designTaskId } = req.body;
      
      // Create design file record
      const designFile = await storage.createDesignFile({
        designTaskId: parseInt(designTaskId),
        filename: req.file.originalname,
        fileType: path.extname(req.file.originalname).substring(1),
        filePath: req.file.path,
        uploadedBy: req.user.id,
      });
      
      // Get the associated design task
      const designTask = await storage.getDesignTask(designFile.designTaskId);
      
      // Notify relevant parties
      if (designTask) {
        // Get the order
        const order = await storage.getOrder(designTask.orderId);
        
        if (order) {
          // Notify salesperson
          if (order.salespersonId) {
            sendNotification(order.salespersonId, {
              type: 'new_design_file',
              designFile,
              designTask,
              order,
            });
          }
          
          // Notify customer
          const customer = await storage.getCustomer(order.customerId);
          if (customer) {
            const customerUser = await storage.getUser(customer.userId);
            if (customerUser) {
              sendNotification(customerUser.id, {
                type: 'new_design_file',
                designFile,
                designTask,
                order,
              });
            }
          }
        }
      }
      
      res.status(201).json(designFile);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/design-files/:id", isAuthenticated, async (req, res, next) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getDesignFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check permissions
      // TODO: Implement proper permission checks based on role and relation to the file
      
      res.sendFile(file.filePath);
    } catch (error) {
      next(error);
    }
  });
  
  // Production task routes
  app.get("/api/production-tasks", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      let tasks;
      
      if (user.role === 'admin') {
        // Would need an implementation to get all tasks with pagination
        tasks = [];
      } else if (user.role === 'manufacturer') {
        tasks = await storage.getProductionTasksByManufacturerId(user.id);
      } else {
        tasks = [];
      }
      
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/production-tasks", isAuthenticated, hasRole(["admin"]), async (req, res, next) => {
    try {
      const taskData = req.body;
      
      // Create production task
      const task = await storage.createProductionTask(taskData);
      
      // Notify manufacturer if assigned
      if (task.manufacturerId) {
        sendNotification(task.manufacturerId, {
          type: 'new_production_task',
          task,
        });
      }
      
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });
  
  // Assign manufacturer to order
  app.put("/api/orders/:orderId/assign-manufacturer", isAuthenticated, hasRole(["admin"]), async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { manufacturerId } = req.body;
      
      if (!manufacturerId) {
        return res.status(400).json({ message: "Manufacturer ID is required" });
      }
      
      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Verify the order status is design_approved
      if (order.status !== 'design_approved') {
        return res.status(400).json({ 
          message: "Order must be in 'design_approved' status to assign a manufacturer" 
        });
      }
      
      // Get the manufacturer
      const manufacturer = await storage.getUser(manufacturerId);
      if (!manufacturer || manufacturer.role !== 'manufacturer') {
        return res.status(400).json({ message: "Invalid manufacturer ID" });
      }
      
      // Create or update production task for this order
      const existingTasks = await storage.getProductionTasksByOrderId(orderId);
      let productionTask;
      
      if (existingTasks && existingTasks.length > 0) {
        // Update existing task
        productionTask = await storage.updateProductionTask(existingTasks[0].id, {
          manufacturerId,
          status: 'pending'
        });
      } else {
        // Create new task
        productionTask = await storage.createProductionTask({
          orderId,
          manufacturerId,
          status: 'pending',
          description: `Production task for order #${order.orderNumber}`
        });
      }
      
      // Update order status
      await storage.updateOrder(orderId, {
        status: 'pending_production'
      });
      
      // Send notification to manufacturer
      if (manufacturer) {
        sendNotification(manufacturerId, {
          type: 'assigned_to_production',
          order,
          task: productionTask
        });
      }
      
      res.json({ 
        message: "Manufacturer assigned successfully",
        order: await storage.getOrder(orderId),
        productionTask
      });
    } catch (error) {
      next(error);
    }
  });

  // Update production status
  app.put("/api/orders/:orderId/update-production-status", isAuthenticated, hasRole(["manufacturer", "admin"]), async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      // Validate status
      const validStatuses = ['pending_production', 'in_production', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Status must be one of: ${validStatuses.join(', ')}` 
        });
      }
      
      // Get the order
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get production tasks for this order
      const productionTasks = await storage.getProductionTasksByOrderId(orderId);
      if (!productionTasks || productionTasks.length === 0) {
        return res.status(404).json({ 
          message: "No production task found for this order" 
        });
      }
      
      const productionTask = productionTasks[0];
      
      // Verify permissions (only assigned manufacturer or admin can update)
      if (req.user.role === 'manufacturer' && productionTask.manufacturerId !== req.user.id) {
        return res.status(403).json({ 
          message: "You are not assigned to this production task" 
        });
      }
      
      // Update production task status
      let taskStatus = 'pending';
      if (status === 'in_production') {
        taskStatus = 'in_progress';
      } else if (status === 'completed') {
        taskStatus = 'completed';
      }
      
      await storage.updateProductionTask(productionTask.id, {
        status: taskStatus,
        notes: notes || productionTask.notes
      });
      
      // Update order status
      await storage.updateOrder(orderId, {
        status
      });
      
      // Notify customer about completion
      if (status === 'completed') {
        const customer = await storage.getCustomer(order.customerId);
        if (customer) {
          const customerUser = await storage.getUser(customer.userId);
          if (customerUser) {
            sendNotification(customerUser.id, {
              type: 'order_production_completed',
              order
            });
          }
        }
      }
      
      res.json({ 
        message: "Production status updated successfully",
        order: await storage.getOrder(orderId),
        productionTask: await storage.getProductionTask(productionTask.id)
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/production-tasks/:id", isAuthenticated, hasRole(["admin", "manufacturer"]), async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskData = req.body;
      
      // Only admins can assign manufacturer
      if (req.user.role !== 'admin') {
        delete taskData.manufacturerId;
      }
      
      // Update task
      const task = await storage.updateProductionTask(taskId, taskData);
      
      // Handle status changes and notifications
      if (taskData.status === 'completed') {
        // Update order status
        const order = await storage.getOrder(task.orderId);
        if (order) {
          await storage.updateOrder(order.id, {
            status: 'completed',
          });
          
          // Notify customer
          const customer = await storage.getCustomer(order.customerId);
          if (customer) {
            const customerUser = await storage.getUser(customer.userId);
            if (customerUser) {
              // Send notification via WebSocket
              sendNotification(customerUser.id, {
                type: 'order_completed',
                order,
              });
              
              // Send email
              const emailTemplate = getOrderStatusChangeEmailTemplate(
                order.orderNumber,
                'completed',
                customerUser.firstName || customerUser.username
              );
              await sendEmail({
                ...emailTemplate,
                to: customerUser.email,
              });
            }
          }
        }
      }
      
      res.json(task);
    } catch (error) {
      next(error);
    }
  });
  
  // Messages routes
  app.get("/api/messages", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      
      // Get messages where user is sender or receiver
      const sentMessages = await storage.getMessagesBySenderId(user.id);
      const receivedMessages = await storage.getMessagesByReceiverId(user.id);
      
      // Combine and sort by date
      const messages = [...sentMessages, ...receivedMessages].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      res.json(messages);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/messages", isAuthenticated, async (req, res, next) => {
    try {
      const messageData = req.body;
      
      // Create message
      const message = await storage.createMessage({
        ...messageData,
        senderId: req.user.id,
      });
      
      // Attempt to deliver message via WebSocket
      // This is handled by the messaging system in the websocket
      
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/messages/:id/read", isAuthenticated, async (req, res, next) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the receiver can mark as read
      if (message.receiverId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Mark as read
      const updatedMessage = await storage.markMessageAsRead(messageId);
      
      res.json(updatedMessage);
    } catch (error) {
      next(error);
    }
  });
  
  // Payment routes (Stripe)
  if (stripe) {
    app.post("/api/create-payment-intent", isAuthenticated, async (req, res, next) => {
      try {
        const { orderId, amount } = req.body;
        
        // Validate order exists
        const order = await storage.getOrder(parseInt(orderId));
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          currency: "usd",
          metadata: {
            orderId: orderId.toString(),
          },
        });
        
        // Create payment record
        const payment = await storage.createPayment({
          orderId: parseInt(orderId),
          amount: amount.toString(),
          status: 'pending',
          stripePaymentId: paymentIntent.id,
          stripeClientSecret: paymentIntent.client_secret!,
        });
        
        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentId: payment.id,
        });
      } catch (error) {
        next(error);
      }
    });
    
    app.post("/api/webhook", async (req, res, next) => {
      const sig = req.headers['stripe-signature'] as string;
      
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(400).json({ message: "Webhook secret not configured" });
      }
      
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Update payment status
          const payments = await storage.getPaymentsByOrderId(
            parseInt(paymentIntent.metadata.orderId || '0')
          );
          
          const payment = payments.find(p => p.stripePaymentId === paymentIntent.id);
          
          if (payment) {
            await storage.updatePayment(payment.id, {
              status: 'completed',
            });
            
            // Update order status
            const order = await storage.getOrder(payment.orderId);
            if (order) {
              await storage.updateOrder(order.id, {
                status: 'pending_design',
              });
              
              // Create design task if not already created
              const existingTasks = await storage.getDesignTasksByOrderId(order.id);
              if (existingTasks.length === 0) {
                await storage.createDesignTask({
                  orderId: order.id,
                  status: 'pending',
                  description: `Design task for order ${order.orderNumber}`,
                  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                });
              }
              
              // Notify admin
              const admins = await storage.getUsersByRole('admin');
              for (const admin of admins) {
                sendNotification(admin.id, {
                  type: 'payment_completed',
                  order,
                  payment,
                });
              }
              
              // Notify salesperson
              if (order.salespersonId) {
                sendNotification(order.salespersonId, {
                  type: 'payment_completed',
                  order,
                  payment,
                });
              }
              
              // Send receipt to customer
              const customer = await storage.getCustomer(order.customerId);
              if (customer) {
                const customerUser = await storage.getUser(customer.userId);
                if (customerUser) {
                  const emailTemplate = getPaymentReceiptEmailTemplate(
                    order.orderNumber,
                    `$${parseFloat(payment.amount.toString()).toFixed(2)}`,
                    customerUser.firstName || customerUser.username
                  );
                  await sendEmail({
                    ...emailTemplate,
                    to: customerUser.email,
                  });
                }
              }
            }
          }
          
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Update payment status
          const payments = await storage.getPaymentsByOrderId(
            parseInt(paymentIntent.metadata.orderId || '0')
          );
          
          const payment = payments.find(p => p.stripePaymentId === paymentIntent.id);
          
          if (payment) {
            await storage.updatePayment(payment.id, {
              status: 'failed',
            });
          }
          
          break;
        }
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Get the order by the stripe session ID
          const orders = await storage.getOrdersByStripeSessionId(session.id);
          
          if (orders.length > 0) {
            const order = orders[0];
            
            // Update order as paid
            await storage.updateOrder(order.id, {
              isPaid: true,
              paymentDate: new Date(),
              status: 'pending_design'
            });
            
            // Create payment record if it doesn't exist
            const existingPayments = await storage.getPaymentsByOrderId(order.id);
            if (!existingPayments.some(p => p.status === 'completed')) {
              await storage.createPayment({
                orderId: order.id,
                amount: order.totalAmount.toString(),
                status: 'completed',
                method: 'stripe',
                transactionId: session.payment_intent as string
              });
            }
            
            // Create design task if payment is completed and no task exists
            const existingTasks = await storage.getDesignTasksByOrderId(order.id);
            if (existingTasks.length === 0) {
              await storage.createDesignTask({
                orderId: order.id,
                status: 'pending',
                description: `Design task for order ${order.orderNumber}`,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
              });
            }
            
            // Notify relevant personnel
            const admins = await storage.getUsersByRole('admin');
            for (const admin of admins) {
              await sendNotification(admin.id, {
                type: 'payment_completed',
                order,
              });
            }
            
            // Get customer and send receipt email
            const customer = await storage.getCustomerByUserId(order.customerId);
            const customerUser = await storage.getUser(order.customerId);
            
            if (customer && customerUser && customerUser.email) {
              try {
                const emailTemplate = getPaymentReceiptEmailTemplate(
                  order.orderNumber,
                  `$${parseFloat(order.totalAmount.toString()).toFixed(2)}`,
                  customerUser.firstName || customerUser.username
                );
                
                await sendEmail({
                  ...emailTemplate,
                  to: customerUser.email
                });
              } catch (emailError) {
                console.error('Failed to send receipt email:', emailError);
              }
            }
          }
          
          break;
        }
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      
      res.json({ received: true });
    });
    
    // Payment verification endpoint - used by success page to verify payment was completed
    app.get("/api/payment-verify", async (req, res, next) => {
      try {
        const sessionId = req.query.session_id as string;
        
        if (!sessionId) {
          return res.status(400).json({ message: "Missing session ID" });
        }
        
        if (!stripe) {
          return res.status(500).json({ message: "Stripe is not configured" });
        }
        
        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }
        
        // Get order by session ID
        const orders = await storage.getOrdersByStripeSessionId(sessionId);
        
        if (orders.length === 0) {
          return res.status(404).json({ message: "No order found for this session" });
        }
        
        const order = orders[0];
        
        // Return relevant information about the order
        res.json({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: order.status,
          isPaid: order.isPaid,
          totalAmount: order.totalAmount
        });
      } catch (error) {
        next(error);
      }
    });
  }
  
  // Dashboard data routes
  // Admin endpoints for customer management
  app.get("/api/admin/customers", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const allCustomers = await storage.getAllCustomers();
      res.json(allCustomers);
    } catch (error) {
      next(error);
    }
  });

  // Add a new customer - POST endpoint
  app.post("/api/admin/customers", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const { firstName, lastName, email, company, phone, address, city, state, zip, country } = req.body;
      
      // Create user first
      const user = await storage.createUser({
        username: email.split('@')[0], // Generate username from email
        email: email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        firstName: firstName,
        lastName: lastName,
        role: 'customer',
        phone: phone,
        company: company
      });
      
      // Then create customer profile
      const customer = await storage.createCustomer({
        userId: user.id,
        address: address,
        city: city,
        state: state,
        zip: zip,
        country: country
      });
      
      res.status(201).json({ success: true, customer });
    } catch (error) {
      console.error("Error creating customer:", error);
      next(error);
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      // Get order statistics
      const orderStats = await storage.getOrderStatistics();
      
      // Get recent orders
      const recentOrders = await storage.getRecentOrders(5);
      
      // Get counts of users by role
      const adminCount = (await storage.getUsersByRole("admin")).length;
      const salespersonCount = (await storage.getUsersByRole("salesperson")).length;
      const designerCount = (await storage.getUsersByRole("designer")).length;
      const manufacturerCount = (await storage.getUsersByRole("manufacturer")).length;
      const customerCount = (await storage.getUsersByRole("customer")).length;
      
      // Get active orders count
      const activeOrders = orderStats.find(stat => 
        stat.status !== 'completed' && stat.status !== 'cancelled')?.count || 0;
      
      // Get design tasks count
      const designTasks = (await storage.getAllDesignTasks()).length;
      
      // Get total revenue
      const payments = await storage.getAllPayments();
      const totalRevenue = payments.reduce((sum, payment) => {
        if (payment.status === 'completed') {
          return sum + (typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount);
        }
        return sum;
      }, 0);
      
      // Generate monthly revenue data for the past 6 months
      const today = new Date();
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = month.toLocaleString('default', { month: 'short' });
        
        const monthPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return paymentDate.getMonth() === month.getMonth() && 
                 paymentDate.getFullYear() === month.getFullYear() &&
                 payment.status === 'completed';
        });
        
        const revenue = monthPayments.reduce((sum, payment) => {
          return sum + (typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount);
        }, 0);
        
        monthlyRevenue.push({
          month: monthName,
          revenue
        });
      }
      
      // Format order stats for pie chart
      const ordersByStatus = orderStats.map(stat => ({
        status: stat.status.replace(/_/g, ' '),
        count: stat.count
      }));
      
      res.json({
        stats: {
          totalOrders: recentOrders.length,
          activeOrders,
          designTasks,
          totalRevenue
        },
        orderStats,
        ordersByStatus,
        recentOrders,
        monthlyRevenue,
        userCounts: {
          admin: adminCount,
          salesperson: salespersonCount,
          designer: designerCount,
          manufacturer: manufacturerCount,
          customer: customerCount,
        },
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Admin action routes
  // Assign manufacturer to order
  app.patch("/api/orders/:orderId/assign-manufacturer", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { manufacturerId } = req.body;
      
      if (!manufacturerId) {
        return res.status(400).json({ message: "Manufacturer ID is required" });
      }
      
      const updatedOrder = await storage.assignManufacturerToOrder(orderId, parseInt(manufacturerId));
      
      // Create a production task if it doesn't exist yet
      const existingTasks = await storage.getProductionTasksByOrderId(orderId);
      if (existingTasks.length === 0) {
        await storage.createProductionTask({
          orderId,
          status: 'pending',
          notes: 'Assigned by administrator',
          createdAt: new Date()
        });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });
  
  // Approve design task
  app.patch("/api/design-tasks/:taskId/approve", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      const updatedTask = await storage.approveDesignTask(taskId);
      
      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  });
  
  // Mark order as paid
  app.patch("/api/orders/:orderId/mark-paid", isAuthenticated, requireAdmin, async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      const updatedOrder = await storage.markOrderAsPaid(orderId);
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/dashboard/inventory", isAuthenticated, hasRole(["admin", "manufacturer"]), async (req, res, next) => {
    try {
      const inventoryItems = await storage.getInventoryItems();
      res.json(inventoryItems);
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
