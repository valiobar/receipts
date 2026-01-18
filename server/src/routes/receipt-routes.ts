import { Router } from 'express';
import { listReceipts, getReceipt, exportReceipts } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// All receipt routes require authentication
router.use(authenticate);

// GET /api/receipts
router.get('/', listReceipts);

// GET /api/receipts/:id
router.get('/:id', getReceipt);

// GET /api/receipts/export
router.get('/export', exportReceipts);

export default router;

