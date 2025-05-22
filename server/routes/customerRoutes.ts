import express, { Router } from 'express';
import { createCustomer } from '../controllers/customerController';
// Temporarily remove auth requirement for testing
// import { requireAuth } from '../auth';

const router = Router();

// Route to create a new customer - no auth for direct testing
router.post('/', createCustomer);

export default router;