import { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../auth/auth';

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
 * Update organization information
 */
async function updateOrganization(req: Request, res: Response) {
  const { organizationId } = req.params;
  const {
    name,
    type,
    sport,
    description,
    website,
    phone,
    address,
    notes
  } = req.body;

  try {
    console.log(`Updating organization: ${organizationId}`, req.body);

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and type are required'
      });
    }

    // For now, we'll update all customers with this organization name
    // In a real implementation, you'd have a separate organizations table
    const oldName = organizationId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    // First, check if any customers exist with this organization
    const { data: existingCustomers, error: checkError } = await supabaseAdmin
      .from('customers')
      .select('id, company')
      .ilike('company', `%${oldName}%`);

    if (checkError) {
      console.error('Error checking existing customers:', checkError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing organization data'
      });
    }

    if (!existingCustomers || existingCustomers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Update organization customers
    const updateData: any = {
      company: name,
      organization_type: type,
      updated_at: new Date().toISOString()
    };

    // Only update sport if it's provided and type is sports
    if (type === 'sports' && sport) {
      updateData.sport = sport;
    } else if (type !== 'sports') {
      updateData.sport = null;
    }

    const { data: updatedCustomers, error: updateError } = await supabaseAdmin
      .from('customers')
      .update(updateData)
      .ilike('company', `%${oldName}%`)
      .select();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return res.status(500).json({
        success: false,
        message: `Database update failed: ${updateError.message}`
      });
    }

    // In a future implementation, you would also update an organizations table
    // with additional fields like description, website, phone, address, notes

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: {
        id: organizationId,
        name,
        type,
        sport,
        updatedCustomers: updatedCustomers?.length || 0,
        customersUpdated: updatedCustomers?.map(c => ({ id: c.id, company: c.company }))
      }
    });

  } catch (error) {
    console.error('Error in updateOrganization:', error);
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
router.get('/:organizationId', getOrganizationDetails);
router.patch('/:organizationId', requireAuth, requireRole(['admin']), updateOrganization);
router.put('/:organizationId', requireAuth, requireRole(['admin']), updateOrganization); // Support both PATCH and PUT
router.patch('/:organizationId/archive', requireAuth, requireRole(['admin']), archiveOrganization);
router.delete('/:organizationId', requireAuth, requireRole(['admin']), deleteOrganization);

export default router;