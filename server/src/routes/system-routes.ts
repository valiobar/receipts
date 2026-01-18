import { Router } from 'express';
import { getSystemStatus, getDebugInfo, restartServer, unlockSocket } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All system routes require authentication
router.use(authenticate);

// GET /api/system/status
router.get('/status', getSystemStatus);

// GET /api/system/debug (Super Admin only)
router.get('/debug', authorize('Super'), getDebugInfo);

// POST /api/system/restart (Super Admin only)
router.post('/restart', authorize('Super'), restartServer);

// GET /api/system/debug/socket/:socketId (Super Admin only)
router.get('/debug/socket/:socketId', authorize('Super'), unlockSocket);

export default router;

