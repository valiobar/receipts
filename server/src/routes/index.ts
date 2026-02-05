import { Router } from 'express';
import authRoutes from './auth-routes';
import receiptRoutes from './receipt-routes';
import deviceRoutes from './device-routes';
import systemRoutes from './system-routes';
import brpRoutes from './brp-routes';

const router = Router();

// Mount route handlers
router.use('/auth', authRoutes);
router.use('/receipts', receiptRoutes);
router.use('/devices', deviceRoutes);
router.use('/system', systemRoutes);
router.use('/brp', brpRoutes);

export default router;

