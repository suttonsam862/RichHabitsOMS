import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../../middleware/adminAuth';

// Create service client for bypassing RLS
const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const router = Router();

// Validation schemas
const createFabricSchema = z.object({
  name: z.string().min(1, 'Fabric name is required').max(100, 'Fabric name too long').trim(),
  description: z.string().optional()
});

/**
 * GET /api/fabric-options/fabrics
 * Fetch all active fabrics
 * Requires authentication
 */
router.get('/fabrics', async (req, res) => {
  try {
    const startTime = Date.now();
    
    console.log('🧵 Fetching fabric options...');
    
    const { data: fabrics, error } = await supabaseService
      .from('catalog_fabrics')
      .select('id, name, description, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Database error fetching fabrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch fabric options',
        error: error.message
      });
    }

    const duration = Date.now() - startTime;
    console.log(`🧵 Successfully fetched ${fabrics?.length || 0} fabrics in ${duration}ms`);

    res.json({
      success: true,
      data: {
        fabrics: fabrics || []
      }
    });

  } catch (error) {
    console.error('❌ Error in fabric options route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching fabric options',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/fabric-options/fabrics
 * Create a new fabric option
 * Requires admin authentication
 */
router.post('/fabrics', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Validate input
    const validationResult = createFabricSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.error.format()
      });
    }

    const { name, description } = validationResult.data;
    
    console.log(`🧵 Creating new fabric: ${name}`);

    // Check if fabric already exists
    const { data: existingFabric } = await supabaseService
      .from('catalog_fabrics')
      .select('id, name')
      .eq('name', name)
      .single();

    if (existingFabric) {
      return res.status(409).json({
        success: false,
        message: `Fabric "${name}" already exists`
      });
    }

    // Create new fabric
    const { data: newFabric, error } = await supabaseService
      .from('catalog_fabrics')
      .insert({
        name,
        description: description || null,
        is_active: true
      })
      .select('id, name, description, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('❌ Database error creating fabric:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create fabric',
        error: error.message
      });
    }

    const duration = Date.now() - startTime;
    console.log(`🧵 Successfully created fabric "${name}" in ${duration}ms`);

    res.status(201).json({
      success: true,
      message: `Fabric "${name}" created successfully`,
      data: {
        fabric: newFabric
      }
    });

  } catch (error) {
    console.error('❌ Error creating fabric:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating fabric',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;