
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
 * Get all contacts for a customer
 */
async function getCustomerContacts(req: Request, res: Response) {
  const { customerId } = req.params;

  try {
    const { data: contacts, error } = await supabaseAdmin
      .from('customer_contacts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at');

    if (error) {
      console.error('Error fetching customer contacts:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customer contacts'
      });
    }

    res.json({
      success: true,
      data: contacts
    });

  } catch (error) {
    console.error('Error in getCustomerContacts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Create new customer contact
 */
async function createCustomerContact(req: Request, res: Response) {
  const contactData = req.body;

  try {
    // If this is being set as primary, update existing primary contacts
    if (contactData.isPrimary) {
      await supabaseAdmin
        .from('customer_contacts')
        .update({ 
          is_primary: false,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', contactData.customerId)
        .eq('is_primary', true);
    }

    const { data: contact, error } = await supabaseAdmin
      .from('customer_contacts')
      .insert({
        customer_id: contactData.customerId,
        first_name: contactData.firstName,
        last_name: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        mobile_phone: contactData.mobilePhone,
        job_title: contactData.jobTitle,
        department: contactData.department,
        contact_type: contactData.contactType || 'general',
        is_primary: contactData.isPrimary || false,
        is_decision_maker: contactData.isDecisionMaker || false,
        can_approve_orders: contactData.canApproveOrders || false,
        preferred_contact_method: contactData.preferredContactMethod || 'email',
        contact_time_preference: contactData.contactTimePreference,
        communication_frequency: contactData.communicationFrequency || 'as_needed',
        notes: contactData.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer contact:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      data: contact,
      message: 'Customer contact created successfully'
    });

  } catch (error) {
    console.error('Error in createCustomerContact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Update customer contact
 */
async function updateCustomerContact(req: Request, res: Response) {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // If this is being set as primary, update existing primary contacts
    if (updateData.isPrimary) {
      const { data: existingContact } = await supabaseAdmin
        .from('customer_contacts')
        .select('customer_id')
        .eq('id', id)
        .single();

      if (existingContact) {
        await supabaseAdmin
          .from('customer_contacts')
          .update({ 
            is_primary: false,
            updated_at: new Date().toISOString()
          })
          .eq('customer_id', existingContact.customer_id)
          .eq('is_primary', true)
          .neq('id', id);
      }
    }

    const { data: contact, error } = await supabaseAdmin
      .from('customer_contacts')
      .update({
        first_name: updateData.firstName,
        last_name: updateData.lastName,
        email: updateData.email,
        phone: updateData.phone,
        mobile_phone: updateData.mobilePhone,
        job_title: updateData.jobTitle,
        department: updateData.department,
        contact_type: updateData.contactType,
        is_primary: updateData.isPrimary,
        is_decision_maker: updateData.isDecisionMaker,
        can_approve_orders: updateData.canApproveOrders,
        preferred_contact_method: updateData.preferredContactMethod,
        contact_time_preference: updateData.contactTimePreference,
        communication_frequency: updateData.communicationFrequency,
        notes: updateData.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer contact:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      data: contact,
      message: 'Customer contact updated successfully'
    });

  } catch (error) {
    console.error('Error in updateCustomerContact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Delete customer contact
 */
async function deleteCustomerContact(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('customer_contacts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting customer contact:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Customer contact deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteCustomerContact:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Configure routes
router.get('/customer/:customerId', requireAuth, getCustomerContacts);
router.post('/', requireAuth, requireRole(['admin']), createCustomerContact);
router.patch('/:id', requireAuth, requireRole(['admin']), updateCustomerContact);
router.delete('/:id', requireAuth, requireRole(['admin']), deleteCustomerContact);

export default router;
