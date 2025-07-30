import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/auth';
import orderController from '../../controllers/orderController';

const router = Router();

/**
 * Order Routes - Using proper controller with transaction handling
 */

// GET /api/orders - Get all orders with filtering and pagination
router.get('/', requireAuth, orderController.getAllOrders);

// GET /api/orders/:id - Get specific order by ID
router.get('/:id', requireAuth, orderController.getOrderById);

// POST /api/orders - Create new order with items
router.post('/', requireAuth, requireRole(['admin', 'salesperson']), orderController.createOrder);

// PUT /api/orders/:id - Update order (excluding items)
router.put('/:id', requireAuth, requireRole(['admin', 'salesperson']), orderController.updateOrder);

// DELETE /api/orders/:id - Delete order and all items
router.delete('/:id', requireAuth, requireRole(['admin', 'salesperson']), orderController.deleteOrder);

// GET /api/orders/:id/items - Get order items
router.get('/:id/items', requireAuth, orderController.getOrderItems);

// POST /api/orders/:id/items - Add item to existing order
router.post('/:id/items', requireAuth, requireRole(['admin', 'salesperson']), orderController.addOrderItem);

export default router;