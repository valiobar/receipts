import { Request, Response } from 'express';
import { eventService } from '../services/EventService';
import { isIPWhitelisted, getClientIP } from '../utils/ip-whitelist';
import logger from '../config/winston';

/**
 * GET /webhook
 * Receive webhook from external system for receipt processing
 */
export const handleReceiptWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate IP address
    const clientIP = getClientIP(req);
    
    if (!isIPWhitelisted(clientIP)) {
      logger.warn('Webhook request from unauthorized IP', {
        ip: clientIP,
        path: req.path,
      });
      
      res.status(403).json({
        success: false,
        error: 'Unauthorized IP address',
      });
      return;
    }
    
    // Parse query parameters
    const { isSuccess, message } = req.query;
    
    // Return success: false if isSuccess is not true
    if (isSuccess !== 'true') {
      res.json({ success: false });
      return;
    }
    
    // Validate message parameter
    if (!message || typeof message !== 'string') {
      logger.warn('Webhook missing message parameter', {
        ip: clientIP,
      });
      res.json({ success: false });
      return;
    }
    
    // Parse message: "Club:Bulgaria;Zone:Fitness;MembershipFee:123.99;UserNumber:123456;123"
    const params = message.split(';');
    
    const extractValue = (param: string, prefix: string): string | null => {
      const match = param.match(new RegExp(`${prefix}:(.+)`));
      return match ? match[1].trim() : null;
    };
    
    const club = extractValue(params[0], 'Club') || extractValue(params[0], 'club');
    const zone = extractValue(params[1], 'Zone') || extractValue(params[1], 'zone');
    const membershipFee = extractValue(params[2], 'MembershipFee') || extractValue(params[2], 'MembershipFee') || extractValue(params[2], 'Fee');
    const userNumber = extractValue(params[3], 'UserNumber') || extractValue(params[3], 'User') || extractValue(params[3], 'userNumber');
    const deviceId = params[4]?.trim() || null;
    
    // Validate required fields
    if (!userNumber || userNumber.length < 2) {
      logger.info('Employee or invalid receipt (user number too short)', {
        club,
        userNumber,
        deviceId,
        ip: clientIP,
      });
      res.json({ success: true }); // Still return success
      return;
    }
    
    const fee = parseFloat(membershipFee || '0');
    if (fee <= 0) {
      logger.info('Invalid receipt (membership fee <= 0)', {
        club,
        userNumber,
        membershipFee,
        ip: clientIP,
      });
      res.json({ success: true }); // Still return success
      return;
    }
    
    // Emit receipt event
    eventService.emitReceipt({
      device: deviceId || club || 'unknown',
      amount: 2.76, // Fixed amount per documentation
      membershipFee: fee,
      user: userNumber,
      location: club || zone || 'unknown',
      ip: clientIP,
      club: club || 'unknown',
      zone: zone || undefined,
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Receipt webhook error', {
      error: error instanceof Error ? error.message : String(error),
      ip: getClientIP(req),
    });
    
    res.json({ success: false });
  }
};

// Note: Report webhook handler is NOT implemented.
// All report types (daily, period, cmd, daily-X, spad-naprejenie) are triggered
// by the client (frontend) via the API endpoint POST /api/devices/:id/command.
// See Step 7 (Device Controller) for the implementation.

