import { Router } from 'express';
import { supabase } from '../../db';
import { requireAuth, requireRole } from '../../middleware/adminAuth';
import { catalogCategories, catalogSports } from '../../../shared/schema';

const router = Router();

// Get all categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('catalog_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        categories: categories || []
      },
      meta: {
        total: categories?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in get categories route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add new category
router.post('/categories', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const categoryName = name.trim();

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('catalog_categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category already exists'
      });
    }

    // Insert new category
    const { data: newCategory, error } = await supabase
      .from('catalog_categories')
      .insert({
        name: categoryName,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }

    return res.status(201).json({
      success: true,
      category: newCategory
    });
  } catch (error) {
    console.error('Error in create category route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all sports
router.get('/sports', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), async (req, res) => {
  try {
    const { data: sports, error } = await supabase
      .from('catalog_sports')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching sports:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sports'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sports: sports || []
      },
      meta: {
        total: sports?.length || 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in get sports route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add new sport
router.post('/sports', requireAuth, requireRole(['admin', 'catalog_manager', 'customer_catalog_manager']), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Sport name is required'
      });
    }

    const sportName = name.trim();

    // Check if sport already exists
    const { data: existingSport } = await supabase
      .from('catalog_sports')
      .select('id')
      .eq('name', sportName)
      .single();

    if (existingSport) {
      return res.status(409).json({
        success: false,
        message: 'Sport already exists'
      });
    }

    // Insert new sport
    const { data: newSport, error } = await supabase
      .from('catalog_sports')
      .insert({
        name: sportName,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating sport:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create sport'
      });
    }

    return res.status(201).json({
      success: true,
      sport: newSport
    });
  } catch (error) {
    console.error('Error in create sport route:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;