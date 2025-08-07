import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../../middleware/globalAuth';
import { guaranteedDatabaseUpdate, DatabaseUpdateConfig } from '../../utils/databaseUpdateTemplate';
import { z } from 'zod';

const router = Router();

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Get organization details including customers and orders
 */
async function getOrganizationDetails(req: Request, res: Response) {
  const { organizationId } = req.params;

  try {
    console.log(`Fetching organization details for: ${organizationId}`);

    // Get organization customers
    const { data: customers, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .ilike('company', `%${organizationId.replace(/-/g, ' ')}%`);

    if (customerError) {
      console.error('Error fetching organization customers:', customerError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organization details'
      });
    }

    // Get organization orders (mock data for now)
    const mockOrders = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customer: customers?.[0]?.first_name + ' ' + customers?.[0]?.last_name,
        items: 'Custom Team Jerseys x 25',
        status: 'completed',
        total: '$1,250.00',
        date: '2024-01-15',
        type: 'current'
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        customer: customers?.[1]?.first_name + ' ' + customers?.[1]?.last_name,
        items: 'Training Equipment Set',
        status: 'in_progress',
        total: '$850.00',
        date: '2024-01-20',
        type: 'current'
      }
    ];

    const organizationData = {
      id: organizationId,
      name: organizationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      customers: customers || [],
      orders: mockOrders,
      stats: {
        totalCustomers: customers?.length || 0,
        totalOrders: mockOrders.length,
        totalRevenue: '$2,100.00',
        avgOrderValue: '$1,050.00'
      }
    };

    res.json({
      success: true,
      data: organizationData
    });

  } catch (error) {
    console.error('Error in getOrganizationDetails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get all organizations
 */
async function getAllOrganizations(req: Request, res: Response) {
  try {
    console.log('Fetching all organizations...');

    // Fetch all unique organization names from the customers table
    const { data: organizations, error } = await supabaseAdmin
      .from('customers')
      .select('company')
      .not('company', 'is', null)
      .neq('company', ''); // Ensure company is not null or empty

    if (error) {
      console.error('Error fetching organizations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch organizations'
      });
    }

    // Process the data to get unique organization names and format them
    const uniqueOrganizations = organizations
      .map(org => org.company)
      .filter((value, index, self) => self.indexOf(value) === index) // Get unique values
      .map(companyName => {
        // Basic formatting: replace hyphens with spaces and capitalize words
        const formattedName = companyName
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        // Generate a slug-like ID (e.g., "Example Org" -> "example-org")
        const id = companyName.toLowerCase().replace(/\s+/g, '-');
        return {
          id: id,
          name: formattedName,
          // Add other relevant organization fields if available in the customers table,
          // or if you have a separate organizations table.
          // For now, we'll just use name and a generated ID.
        };
      });

    // If no organizations exist, return empty array with proper structure
    const orgData = uniqueOrganizations || [];

    res.status(200).json({
      success: true,
      data: orgData,
      count: orgData.length
    });

  } catch (error) {
    console.error('Error in getAllOrganizations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}


// Organization update validation schema
const organizationUpdateSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  type: z.enum(['sports', 'business', 'education', 'nonprofit', 'government']),
  sport: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Update organization information using guaranteed database update template
 */
async function updateOrganization(req: Request, res: Response) {
  const { organizationId } = req.params;

  console.log(`🔄 Organization update requested for: ${organizationId}`);
  console.log('📊 Update data:', req.body);

  try {
    // Validate authentication first
    if (!req.user) {
      console.error('❌ Authentication failed for organization update');
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    console.log(`✅ User authenticated: ${req.user.email} (${req.user.role})`);

    const { name, type, sport, description, website, phone, address, notes } = req.body;

    // Validate required fields
    if (!name || !type) {
      console.error('❌ Missing required fields:', { name: !!name, type: !!type });
      return res.status(400).json({
        success: false,
        message: 'Organization name and type are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Schema validation
    try {
      organizationUpdateSchema.parse(req.body);
      console.log('✅ Schema validation passed');
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Schema validation failed:', error.errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_FAILED',
          validationErrors: error.errors.reduce((acc, err) => ({
            ...acc,
            [err.path.join('.')]: err.message
          }), {})
        });
      }
      throw error;
    }

    // Convert organization ID to name for customer lookup
    const oldName = organizationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    console.log(`🔍 Looking for customers with company: ${oldName}`);

    // Check if customers exist with this organization
    const { data: existingCustomers, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('id, company, first_name, last_name')
      .ilike('company', `%${oldName}%`);

    if (checkError) {
      console.error('❌ Error checking existing customers:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing organization data',
        error: 'DATABASE_CHECK_FAILED'
      });
    }

    if (!existingCustomers || existingCustomers.length === 0) {
      console.error(`❌ No customers found for organization: ${oldName}`);
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
        error: 'ORGANIZATION_NOT_FOUND'
      });
    }

    console.log(`✅ Found ${existingCustomers.length} customers for organization`);

    // Prepare update data
    const updateData: any = {
      company: name,
      organization_type: type,
      updated_at: new Date().toISOString()
    };

    // Handle sport field based on organization type
    if (type === 'sports' && sport) {
      updateData.sport = sport;
    } else if (type !== 'sports') {
      updateData.sport = null;
    }

    console.log('🔄 Executing customer updates...');

    // Update all customers with this organization
    const { data: updatedCustomers, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .ilike('company', `%${oldName}%`)
      .select();

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      return res.status(500).json({
        success: false,
        message: `Database update failed: ${updateError.message}`,
        error: 'DATABASE_UPDATE_FAILED'
      });
    }

    if (!updatedCustomers || updatedCustomers.length === 0) {
      console.error('❌ Update returned no data');
      return res.status(500).json({
        success: false,
        message: 'Update failed - no data returned',
        error: 'NO_DATA_RETURNED'
      });
    }

    console.log(`✅ Successfully updated ${updatedCustomers.length} customers`);

    // Create audit log entry
    try {
      await supabaseAdmin
        .from('audit_log')
        .insert({
          table_name: 'customers',
          entity_id: organizationId,
          action: 'ORGANIZATION_UPDATE',
          old_data: { organizationId, oldName },
          new_data: { name, type, sport, affectedCustomers: updatedCustomers.length },
          user_id: req.user.id,
          user_email: req.user.email,
          timestamp: new Date().toISOString(),
          ip_address: req.ip,
          user_agent: req.get('User-Agent') || 'Unknown'
        });
      console.log('✅ Audit log created');
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success response
    console.log('🎉 Organization update completed successfully');
    return res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      data: {
        id: organizationId,
        name,
        type,
        sport,
        updatedCustomers: updatedCustomers?.length || 0,
        customersUpdated: updatedCustomers?.map(c => ({
          id: c.id,
          company: c.company,
          firstName: c.first_name,
          lastName: c.last_name
        }))
      }
    });

  } catch (error) {
    console.error('💥 Unexpected error in updateOrganization:', error);
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
}

/**
 * Archive organization (soft delete)
 */
async function archiveOrganization(req: Request, res: Response) {
  const { organizationId } = req.params;

  try {
    console.log(`Archiving organization: ${organizationId}`);

    const oldName = organizationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Mark customers as archived (you could add an is_archived field)
    const { data: archivedCustomers, error: archiveError } = await supabaseAdmin
      .from('customers')
      .update({
        is_archived: true,
        archived_at: 'NOW()',
        updated_at: 'NOW()'
      })
      .ilike('company', `%${oldName}%`)
      .select();

    if (archiveError) {
      console.error('Error archiving organization:', archiveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to archive organization'
      });
    }

    res.json({
      success: true,
      message: 'Organization archived successfully',
      data: {
        id: organizationId,
        archivedCustomers: archivedCustomers?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in archiveOrganization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete organization (hard delete)
 */
async function deleteOrganization(req: Request, res: Response) {
  const { organizationId } = req.params;

  try {
    console.log(`Deleting organization: ${organizationId}`);

    const oldName = organizationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Delete customers associated with this organization
    const { data: deletedCustomers, error: deleteError } = await supabaseAdmin
      .from('customers')
      .delete()
      .ilike('company', `%${oldName}%`)
      .select();

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete organization'
      });
    }

    res.json({
      success: true,
      message: 'Organization deleted successfully',
      data: {
        id: organizationId,
        deletedCustomers: deletedCustomers?.length || 0
      }
    });

  } catch (error) {
    console.error('Error in deleteOrganization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/', requireAuth, requireRole(['admin', 'user']), getAllOrganizations);
router.get('/:id', getOrganizationDetails);
router.patch('/:organizationId', requireAuth, requireRole(['admin']), updateOrganization);
router.put('/:organizationId', requireAuth, requireRole(['admin']), updateOrganization); // Support both PATCH and PUT
router.patch('/:organizationId/archive', requireAuth, requireRole(['admin']), archiveOrganization);
router.delete('/:organizationId', requireAuth, requireRole(['admin']), deleteOrganization);

export default router;