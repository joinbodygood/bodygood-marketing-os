import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Supabase Auth handles login/logout client-side via supabase-js.
// This endpoint returns the authenticated user's profile so the frontend
// can make role-based UI decisions server-verified.
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
    },
    profile: req.profile,
  });
});

export default router;
