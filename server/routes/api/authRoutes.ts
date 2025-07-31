import { Router } from 'express';
import { 
  authenticateRequest, 
  loginUser, 
  logoutUser, 
  getCurrentUser 
} from '../auth/auth';

const router = Router();

// Auth endpoints (login doesn't need auth middleware, but others do)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Demo authentication - accept any @demo.com email with password 'demo'
    if (email.endsWith('@demo.com') && password === 'demo') {
      const user = {
        id: 'demo-user-' + Date.now(),
        email: email,
        role: 'admin',
        firstName: email.split('@')[0],
        lastName: 'User'
      };

      // Store user in session
      req.session.user = user;
      req.session.token = 'demo-token-' + Date.now();

      console.log('✅ Demo login successful for:', email);

      return res.json({
        success: true,
        message: 'Login successful',
        user: user
      });
    }

    // Fall back to the actual login function for real users
    return await loginUser(req, res);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
router.post('/logout', authenticateRequest, logoutUser);
router.get('/me', authenticateRequest, getCurrentUser);

export default router;