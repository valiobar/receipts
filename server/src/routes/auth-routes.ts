import { Router } from 'express';
import { login, refresh, logout } from '../controllers';
import { authenticate } from '../middleware/auth';
import { validate, validators } from '../middleware/validation';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  validate({
    body: {
      username: (v) => validators.required(v) === true && validators.minLength(3)(v),
      password: (v) => validators.required(v) === true && validators.minLength(6)(v),
    },
  }),
  login
);

// POST /api/auth/refresh
router.post('/refresh', authenticate, refresh);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

export default router;

