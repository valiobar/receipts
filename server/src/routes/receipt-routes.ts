import { Router } from 'express';
import { listReceipts, getReceipt, exportReceipts } from '../controllers';
import { authenticate } from '../middleware/auth';

const router = Router();

// All receipt routes require authentication
router.use(authenticate);

// GET /api/receipts
router.get('/', listReceipts);

// GET /api/receipts/export (must be before /:id so "export" is not matched as id)
router.get('/export', exportReceipts);

// GET /api/receipts/:id
router.get('/:id', getReceipt);

export default router;

