import express, { Router } from 'express';
import { createCustomer } from '../controllers/customerController';
import { requireAuth } from '../auth';

const router = Router();

// Route to create a new customer
router.post('/', requireAuth, createCustomer);

export default router;