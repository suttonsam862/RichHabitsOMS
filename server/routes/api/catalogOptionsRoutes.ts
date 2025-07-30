import { Request, Response, Router } from 'express';

const router = Router();

// Default categories
const DEFAULT_CATEGORIES = [
  'Jerseys',
  'Shorts',
  'Accessories',
  'Equipment',
  'Custom Apparel',
  'Warm-ups',
  'Hoodies',
  'Polo Shirts',
  'T-Shirts',
  'Jackets'
];

// Default sports
const DEFAULT_SPORTS = [
  'Football',
  'Basketball',
  'Soccer',
  'Baseball',
  'Hockey',
  'Tennis',
  'Golf',
  'Swimming',
  'Track & Field',  
  'Volleyball',
  'Wrestling',
  'General Sports'
];

/**
 * Get available categories
 */
async function getCategories(req: Request, res: Response) {
  try {
    res.status(200).json({
      success: true,
      data: {
        categories: DEFAULT_CATEGORIES
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
}

/**
 * Get available sports
 */
async function getSports(req: Request, res: Response) {
  try {
    res.status(200).json({
      success: true,
      data: {
        sports: DEFAULT_SPORTS
      }
    });
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sports'
    });
  }
}

// Configure routes
router.get('/categories', getCategories);
router.get('/sports', getSports);

export default router;