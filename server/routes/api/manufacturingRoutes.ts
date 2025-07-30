/**
 * Manufacturing management routes - Phase 6 of Database Synchronization Checklist
 */
import { Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth.js';
import { supabase } from '../../db';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create Supabase admin client with service key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://ctznfijidykgjhzpuyej.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const router = Router();

/**
 * GET /api/manufacturing/stats - Get manufacturing dashboard statistics
 */
export async function getManufacturingStats(req: Request, res: Response) {
  try {
    console.log('📊 Fetching manufacturing dashboard statistics...');

    // Get total orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get orders by status - always handle as array (with default limit for safety)
    const { data: ordersByStatus } = await supabase
      .from('orders')
      .select('status')
      .not('status', 'is', null)
      .limit(100);
    
    const safeOrdersByStatus = ordersByStatus || [];

    // Get production orders (ready for manufacturing)
    const { count: productionOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['design_approved', 'in_production']);

    // Get orders pending assignment
    const { count: pendingAssignment } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'design_approved')
      .is('manufacturerId', null);

    // Get completed orders
    const { count: completedOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get overdue orders (orders past due date)
    const today = new Date().toISOString().split('T')[0];
    const { count: overdueOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .lt('dueDate', today)
      .not('status', 'eq', 'completed');

    // Get active manufacturers count
    const { count: activeManufacturers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'manufacturer')
      .eq('status', 'active');

    // Get average completion time (for completed orders in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentCompletedOrders } = await supabase
      .from('orders')
      .select('created_at, updated_at')
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .limit(100);
    
    const safeRecentCompletedOrders = recentCompletedOrders || [];

    let avgCompletionTime = 0;
    if (recentCompletedOrders && recentCompletedOrders.length > 0) {
      const totalTime = recentCompletedOrders.reduce((sum, order: any) => {
        const start = new Date(order.created_at as string);
        const end = new Date(order.updated_at as string);
        return sum + (end.getTime() - start.getTime());
      }, 0);
      avgCompletionTime = Math.round(totalTime / recentCompletedOrders.length / (1000 * 60 * 60 * 24)); // days
    }

    // Calculate status distribution
    const statusCounts: Record<string, number> = {};
    if (ordersByStatus) {
      ordersByStatus.forEach((order: any) => {
        const status = order.status as string;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }

    const stats = {
      totalOrders: totalOrders || 0,
      productionOrders: productionOrders || 0,
      pendingAssignment: pendingAssignment || 0,
      completedOrders: completedOrders || 0,
      overdueOrders: overdueOrders || 0,
      activeManufacturers: activeManufacturers || 0,
      avgCompletionTime: avgCompletionTime || 0,
      statusDistribution: statusCounts,
      lastUpdated: new Date().toISOString()
    };

    console.log('📊 Manufacturing stats calculated:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Manufacturing stats fetch failed:', error);
    console.error(error.message);
    res.status(400).json({
      success: false,
      message: 'Failed to fetch manufacturing statistics',
      error: error.message
    });
  }
}

/**
 * GET /api/design-tasks - List design tasks (MOCK until Supabase integration complete)
 */
export async function getDesignTasks(req: Request, res: Response) {
  try {
    console.log('📋 Fetching design tasks (MOCK)...');

    // MOCK: Return temporary design task data until Supabase integration is complete
    const mockDesignTasks = [
      {
        id: 'design-task-001',
        order_id: 'order-001',
        designer_id: 'designer-001',
        status: 'pending',
        notes: 'Create custom basketball jersey design with team logo'
      },
      {
        id: 'design-task-002',
        order_id: 'order-002',
        designer_id: 'designer-002',
        status: 'in_progress',
        notes: 'Design soccer uniform with player numbers and names'
      },
      {
        id: 'design-task-003',
        order_id: 'order-003',
        designer_id: 'designer-001',
        status: 'completed',
        notes: 'Football jersey design with custom team colors'
      }
    ];

    console.log('📋 Returning mock design tasks for development');
    
    res.json({
      success: true,
      data: mockDesignTasks,
      message: 'MOCK: Design tasks endpoint - awaiting Supabase integration'
    });
  } catch (error: any) {
    console.error('Design tasks fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/production-tasks - List production tasks
 */
export async function getProductionTasks(req: Request, res: Response) {
  try {
    console.log('📋 Fetching production tasks...');

    const { 
      status, 
      manufacturerId, 
      orderId,
      page = 1,
      limit = 20
    } = req.query;

    // For development, provide mock production tasks to make the UI functional
    if (process.env.NODE_ENV === 'development') {
      const mockTasks = [
        {
          id: 'task-001',
          order_id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
          manufacturer_id: 'mock-mfg-001',
          task_name: 'Material Sourcing',
          description: 'Source high-quality materials for custom uniform production',
          status: 'pending',
          priority: 'high',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: 'NOW()',
          updated_at: 'NOW()',
          orders: {
            id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
            order_number: 'ORD-ERROR-TEST-FINAL',
            status: 'in_production',
            total_amount: 299.99,
            customer_id: '5784f5cb-8999-4f12-9179-354bd240d38e',
            customers: {
              id: '5784f5cb-8999-4f12-9179-354bd240d38e',
              first_name: 'Test',
              last_name: 'Customer',
              company: 'Test Company'
            }
          }
        },
        {
          id: 'task-002',
          order_id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
          manufacturer_id: 'mock-mfg-002',
          task_name: 'Pattern Creation',
          description: 'Create custom patterns for team uniform sizing',
          status: 'in_progress',
          priority: 'medium',
          due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: 'NOW()',
          updated_at: 'NOW()',
          orders: {
            id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
            order_number: 'ORD-ERROR-TEST-FINAL',
            status: 'in_production',
            total_amount: 299.99,
            customer_id: '5784f5cb-8999-4f12-9179-354bd240d38e',
            customers: {
              id: '5784f5cb-8999-4f12-9179-354bd240d38e',
              first_name: 'Test',
              last_name: 'Customer',
              company: 'Test Company'
            }
          }
        },
        {
          id: 'task-003',
          order_id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
          manufacturer_id: 'mock-mfg-003',
          task_name: 'Quality Control',
          description: 'Final quality inspection and packaging',
          status: 'pending',
          priority: 'low',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: 'NOW()',
          updated_at: 'NOW()',
          orders: {
            id: 'e2683a31-943a-4c3a-928f-5bd07e6d7b9e',
            order_number: 'ORD-ERROR-TEST-FINAL',
            status: 'in_production',
            total_amount: 299.99,
            customer_id: '5784f5cb-8999-4f12-9179-354bd240d38e',
            customers: {
              id: '5784f5cb-8999-4f12-9179-354bd240d38e',
              first_name: 'Test',
              last_name: 'Customer',
              company: 'Test Company'
            }
          }
        }
      ];

      console.log(`✅ Found ${mockTasks.length} production tasks (development mock data)`);

      return res.json({
        success: true,
        data: mockTasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockTasks.length,
          pages: Math.ceil(mockTasks.length / Number(limit))
        }
      });
    }

    let query = supabase
      .from('production_tasks')
      .select(`
        *,
        orders!inner(order_number, status)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (manufacturerId) {
      query = query.eq('manufacturerId', manufacturerId);
    }
    if (orderId) {
      query = query.eq('orderId', orderId);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching production tasks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch production tasks',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: tasks || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Production tasks fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/manufacturing/queue - Get manufacturing queue/workflow
 */
export async function getManufacturingQueue(req: Request, res: Response) {
  try {
    console.log('📋 Fetching manufacturing queue...');

    // Get orders in manufacturing workflow stages
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        customers(first_name, last_name, email, company),
        design_tasks(*),
        production_tasks(*)
      `)
      .in('status', [
        'pending_design', 
        'design_in_progress', 
        'design_review',
        'design_approved',
        'pending_production', 
        'in_production'
      ])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching manufacturing queue:', ordersError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing queue',
        error: ordersError.message
      });
    }

    // Get summary statistics
    const designPending = orders?.filter(o => o.status === 'pending_design').length || 0;
    const designInProgress = orders?.filter(o => o.status === 'design_in_progress').length || 0;
    const designReview = orders?.filter(o => o.status === 'design_review').length || 0;
    const productionPending = orders?.filter(o => o.status === 'pending_production').length || 0;
    const inProduction = orders?.filter(o => o.status === 'in_production').length || 0;

    res.json({
      success: true,
      data: {
        orders: orders || [],
        statistics: {
          total: orders?.length || 0,
          design_pending: designPending,
          design_in_progress: designInProgress,
          design_review: designReview,
          production_pending: productionPending,
          in_production: inProduction
        }
      }
    });
  } catch (error: any) {
    console.error('Manufacturing queue fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * PATCH /api/manufacturing/manufacturers/:id - Update manufacturer record
 */
export async function updateManufacturer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    console.log(`🔧 Updating manufacturer ${id}...`);
    console.log('Request body:', req.body);

    const {
      firstName,
      lastName,
      company,
      phone,
      email,
      notes,
      preferredCategories,
      pricingTiers,
      capabilities
    } = req.body;

    // Validate manufacturer ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Manufacturer ID is required'
      });
    }

    // Use Supabase Admin Auth to update user metadata
    const updateData: any = {};
    
    // Update basic profile fields
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;

    // Handle manufacturer-specific fields
    if (notes !== undefined) updateData.notes = notes;
    if (preferredCategories !== undefined) updateData.preferredCategories = preferredCategories;
    if (pricingTiers !== undefined) updateData.pricingTiers = pricingTiers;
    if (capabilities !== undefined) updateData.capabilities = capabilities;

    // Update user metadata in Supabase Auth
    const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: updateData
    });

    if (error) {
      console.error('Error updating manufacturer:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update manufacturer',
        error: error.message
      });
    }

    console.log('✅ Manufacturer updated successfully:', id);

    // Return updated manufacturer data
    const transformedManufacturer = {
      id: updatedUser.user?.id,
      firstName: updatedUser.user?.user_metadata?.firstName || '',
      lastName: updatedUser.user?.user_metadata?.lastName || '',
      email: updatedUser.user?.email || '',
      company: updatedUser.user?.user_metadata?.company || '',
      phone: updatedUser.user?.user_metadata?.phone || '',
      custom_attributes: {
        notes: updatedUser.user?.user_metadata?.notes || '',
        preferredCategories: updatedUser.user?.user_metadata?.preferredCategories || [],
        pricingTiers: updatedUser.user?.user_metadata?.pricingTiers || [],
        capabilities: updatedUser.user?.user_metadata?.capabilities || {}
      },
      role: updatedUser.user?.user_metadata?.role || 'manufacturer',
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Manufacturer updated successfully',
      data: transformedManufacturer
    });
  } catch (error: any) {
    console.error('❌ Manufacturer update failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/manufacturing/manufacturers - List all manufacturers (using approach from userManagementRoutes)
 */
export async function getManufacturers(req: Request, res: Response) {
  try {
    console.log('👥 Fetching manufacturers using Supabase Auth...');

    // Use Supabase Admin Auth to get all users like the working userManagementRoutes does
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching auth users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturers',
        error: error.message
      });
    }

    // Filter for manufacturer role users (following the pattern from userManagementRoutes)
    const manufacturers = authUsers.users
      .filter(user => user.user_metadata?.role === 'manufacturer')
      .map(user => ({
        id: user.id,
        firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
        email: user.email || '',
        company: user.user_metadata?.company || '',
        phone: user.user_metadata?.phone || '',
        specialties: Array.isArray(user.user_metadata?.specialties) 
          ? user.user_metadata.specialties.join(', ')
          : user.user_metadata?.specialties || '',
        status: user.email_confirmed_at ? 'active' : 'pending',
        workload: 0, // Calculate from active orders
        activeOrders: 0,
        completedOrders: 0,
        averageCompletionTime: 0,
        createdAt: user.created_at,
        updatedAt: user.updated_at || user.created_at
      }));

    console.log(`✅ Found ${manufacturers.length} manufacturers`);

    res.json({
      success: true,
      data: manufacturers
    });
  } catch (error: any) {
    console.error('❌ Manufacturers fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * POST /api/manufacturing/manufacturers - Create new manufacturer (using approach from userManagementRoutes)
 */
export async function createManufacturer(req: Request, res: Response) {
  try {
    console.log('🏭 Creating new manufacturer using Supabase Auth...');
    console.log('Request body:', req.body);

    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      specialties,
      address,
      city,
      state,
      zip,
      website,
      equipment,
      maxCapacity,
      turnaroundTime,
      qualityCertifications,
      hourlyRate,
      minimumOrder,
      rushOrderSurcharge,
      paymentTerms
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email'
      });
    }

    // For development: create mock manufacturer response due to database constraints
    if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
      console.log('✅ Creating mock manufacturer for development:', email);
      
      // Create mock manufacturer with proper structure
      const mockManufacturer = {
        id: crypto.randomUUID(),
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        company: company || '',
        phone: phone || '',
        specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties || '',
        status: 'active',
        workload: 0,
        activeOrders: 0,
        completedOrders: 0,
        averageCompletionTime: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Additional development fields
        address: address || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
        website: website || '',
        equipment: Array.isArray(equipment) ? equipment : [],
        maxCapacity: maxCapacity || 0,
        turnaroundTime: turnaroundTime || 0,
        qualityCertifications: Array.isArray(qualityCertifications) ? qualityCertifications : [],
        pricing: {
          hourlyRate: hourlyRate || 0,
          minimumOrder: minimumOrder || 0,
          rushOrderSurcharge: rushOrderSurcharge || 0,
          paymentTerms: paymentTerms || 'net_30'
        }
      };

      console.log('✅ Mock manufacturer created successfully:', mockManufacturer.id);

      return res.status(201).json({
        success: true,
        message: 'Manufacturer created successfully (development mode)',
        data: mockManufacturer
      });
    }

    // Production: Create user in Supabase Auth with manufacturer role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      password: Math.random().toString(36).substring(2, 15), // Random password, user can reset later
      user_metadata: {
        firstName,
        lastName,
        first_name: firstName, // Keep both formats
        last_name: lastName,   // Keep both formats
        role: 'manufacturer',
        company,
        phone,
        specialties: Array.isArray(specialties) ? specialties : (specialties ? [specialties] : []),
        profile: {
          address,
          city,
          state,
          zip,
          website,
          equipment: Array.isArray(equipment) ? equipment : [],
          maxCapacity,
          turnaroundTime,
          qualityCertifications: Array.isArray(qualityCertifications) ? qualityCertifications : [],
          pricing: {
            hourlyRate,
            minimumOrder,
            rushOrderSurcharge,
            paymentTerms: paymentTerms || 'net_30'
          }
        }
      }
    });

    if (authError) {
      console.error('Error creating manufacturer in Supabase Auth:', authError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create manufacturer',
        error: authError.message
      });
    }

    console.log('✅ Manufacturer created successfully:', authData.user?.id);

    // Transform response to match frontend format
    const transformedManufacturer = {
      id: authData.user?.id,
      firstName: firstName,
      lastName: lastName,
      email: email.toLowerCase(),
      company: company || '',
      phone: phone || '',
      specialties: Array.isArray(specialties) ? specialties.join(', ') : specialties || '',
      status: 'active',
      workload: 0,
      activeOrders: 0,
      completedOrders: 0,
      averageCompletionTime: 0,
      createdAt: authData.user?.created_at,
      updatedAt: authData.user?.updated_at || authData.user?.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Manufacturer created successfully',
      data: transformedManufacturer
    });
  } catch (error: any) {
    console.error('❌ Manufacturer creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * GET /api/users/manufacturers - Alternative endpoint for manufacturers
 */
export async function getUserManufacturers(req: Request, res: Response) {
  // This is just a wrapper for the main getManufacturers function
  return getManufacturers(req, res);
}

/**
 * POST /api/design-tasks - Create design task
 */
export async function createDesignTask(req: Request, res: Response) {
  try {
    const {
      orderId,
      designerId,
      description,
      notes,
      dueDate
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const { data: newTask, error } = await supabase
      .from('design_tasks')
      .insert({
        order_id: orderId,
        designer_id: designerId || null,
        description: description || null,
        notes: notes || null,
        due_date: dueDate || null,
        status: 'pending',
        priority: 'medium',
        estimated_hours: 0,
        actual_hours: 0,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Design task creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create design task',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Design task created successfully'
    });
  } catch (error: any) {
    console.error('Design task creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * POST /api/production-tasks - Create production task
 */
export async function createProductionTask(req: Request, res: Response) {
  try {
    const {
      orderId,
      manufacturerId,
      description,
      notes,
      dueDate
    } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const { data: newTask, error } = await supabase
      .from('production_tasks')
      .insert({
        order_id: orderId,
        manufacturer_id: manufacturerId || null,
        description: description || null,
        notes: notes || null,
        due_date: dueDate || null,
        status: 'pending',
        priority: 'medium',
        estimated_hours: 0,
        actual_hours: 0,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Production task creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create production task',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Production task created successfully'
    });
  } catch (error: any) {
    console.error('Production task creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

// Apply authentication middleware
router.use(requireAuth);

// Manufacturing statistics route (no role restriction for dashboard)
router.get('/manufacturing/stats', getManufacturingStats);

// Design task routes
router.get('/design-tasks', getDesignTasks);
router.post('/design-tasks', createDesignTask);

// Production task routes
router.get('/production-tasks', getProductionTasks);
router.post('/production-tasks', createProductionTask);

// Manufacturing queue route
router.get('/manufacturing/queue', getManufacturingQueue);

// Manufacturer management routes
router.get('/manufacturing/manufacturers', getManufacturers);
router.post('/manufacturing/manufacturers', createManufacturer);
router.patch('/manufacturing/manufacturers/:id', updateManufacturer);

// Get design tasks with development fallback
router.get('/design-tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Fetching design tasks for user:', req.user?.email);

    // Get design tasks from database
    const { data: designTasks, error } = await supabase
      .from('design_tasks')
      .select(`
        *,
        order:orders(orderNumber, customer:customers(first_name, last_name)),
        files:design_files(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching design tasks:', error);

      // TODO: Replace with live Supabase query once design_tasks table is properly configured
      // For development, return mock data to prevent UI crashes
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock design tasks for development');
        const mockTasks = [
          {
            id: 'mock-1',
            description: 'Design custom basketball jerseys',
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            order: {
              orderNumber: 'ORD-2024-001'
            },
            files: []
          },
          {
            id: 'mock-2', 
            description: 'Create soccer uniform mockups',
            status: 'in_progress',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            order: {
              orderNumber: 'ORD-2024-002'
            },
            files: [
              {
                id: 'file-1',
                filename: 'soccer-design-v1.png',
                filePath: 'https://example.supabase.co/storage/v1/object/public/designs/mock-design.png',
                fileType: 'image/png'
              }
            ]
          }
        ];
        return res.json(mockTasks);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch design tasks'
      });
    }

    res.json(designTasks || []);
  } catch (error) {
    console.error('Design tasks error:', error);

    // Development fallback for any unexpected errors
    if (process.env.NODE_ENV === 'development') {
      console.log('Fallback: Returning empty array for design tasks');
      return res.json([]);
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;