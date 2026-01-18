import { Router } from 'express';
import { listDevices, getDevice, getDeviceStatus, sendCommand } from '../controllers';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All device routes require authentication
router.use(authenticate);

// GET /api/devices
router.get('/', listDevices);

// GET /api/devices/:id
router.get('/:id', getDevice);

// GET /api/devices/:id/status
router.get('/:id/status', getDeviceStatus);

// POST /api/devices/:id/command (Admin role required)
router.post('/:id/command', authorize('Admin', 'Super'), sendCommand);

export default router;

