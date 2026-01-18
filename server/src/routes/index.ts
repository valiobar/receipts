import { Router } from 'express';
import authRoutes from './auth-routes';
import receiptRoutes from './receipt-routes';
import deviceRoutes from './device-routes';
import systemRoutes from './system-routes';

const router = Router();

// Mount route handlers
router.use('/auth', authRoutes);
router.use('/receipts', receiptRoutes);
router.use('/devices', deviceRoutes);
router.use('/system', systemRoutes);

export default router;

