import { Router } from 'express';
import { handleReceiptWebhook } from '../controllers';

const router = Router();

// GET /webhook (receipt webhook)
router.get('/', handleReceiptWebhook);

// Note: POST /webhook/report is NOT implemented.
// All report types are triggered by the client via POST /api/devices/:id/command.

export default router;

