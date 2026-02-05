import { Router } from 'express';
import { getBRPCustomer, loginBRP } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/brp/customers/:id - Get customer by ID (protected)
router.get('/customers/:id',  getBRPCustomer);

// POST /api/brp/auth/login - Manual login (optional, for testing) (protected)
router.post('/auth/login', authenticate, loginBRP);

export default router;

