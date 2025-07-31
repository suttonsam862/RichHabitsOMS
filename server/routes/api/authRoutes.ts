import { Router } from 'express';
import { 
  authenticateRequest, 
  loginUser, 
  logoutUser, 
  getCurrentUser 
} from '../auth/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateRequest);

// Auth endpoints
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', getCurrentUser);

export default router;