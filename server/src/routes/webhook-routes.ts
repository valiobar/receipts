import { Router } from 'express';
import { handleReceiptWebhook, handleBRPWebhook } from '../controllers';

const router = Router();

// POST /webhook (BRP Event API webhook)
router.post('/', handleBRPWebhook);

// GET /webhook (legacy webhook for backward compatibility)
router.get('/', handleReceiptWebhook);

// Note: POST /webhook/report is NOT implemented.
// All report types are triggered by the client via POST /api/devices/:id/command.

export default router;

