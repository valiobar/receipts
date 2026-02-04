import { Request, Response } from 'express';
import { eventService } from '../services/EventService';
import { isIPWhitelisted, getClientIP } from '../utils/ip-whitelist';
import logger from '../config/winston';
import {
  BRPWebhookPayload,
  BRPEventType,
  BRPBookingEventData,
  RECEIPT_TRIGGER_EVENTS,
} from '../types/brp-events';

/**
 * POST /webhook
 * Receive webhook from BRP Event API for receipt processing
 * Based on BRP Event API documentation
 */
export const handleBRPWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate IP address
    const clientIP = getClientIP(req);
    
    // if (!isIPWhitelisted(clientIP)) {
    //   logger.warn('BRP webhook request from unauthorized IP', {
    //     ip: clientIP,
    //     path: req.path,
    //   });
      
    //   // Return 200 to prevent retries (per BRP retry policy)
    //   res.status(200).json({
    //     success: false,
    //     error: 'Unauthorized IP address',
    //   });
    //   return;
    // }
    
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      logger.warn('BRP webhook missing or invalid body', {
        ip: clientIP,
      });
      res.status(200).json({ success: false });
      return;
    }
    
    const payload = req.body as BRPWebhookPayload;
    
    // Validate event type
    if (!payload.event || !Object.values(BRPEventType).includes(payload.event)) {
      logger.warn('BRP webhook invalid event type', {
        ip: clientIP,
        event: payload.event,
      });
      res.status(200).json({ success: false });
      return;
    }
    
    const eventType = payload.event as BRPEventType;
    
    // Check if this event should trigger receipt processing
    if (!RECEIPT_TRIGGER_EVENTS.includes(eventType)) {
      logger.debug('BRP webhook event does not trigger receipt', {
        ip: clientIP,
        event: eventType,
      });
      // Return success for events we don't process
      res.status(200).json({ success: true });
      return;
    }
     logger.info('BRP webhook event triggers receipt', {
       payload: payload,
       data: payload.data,
    });
    // Extract data from payload
    // The data structure depends on the event type and data projection
    const eventData = payload.data as BRPBookingEventData | Record<string, unknown>;
    
    // Extract required fields for receipt processing
    // Handle different data structures based on event type
    let person: { id?: number; ssn?: string; businessUnit?: { id?: number; name?: string } } | undefined;
    let businessUnit: { id?: number; name?: string; timeZone?: string } | undefined;
    let amount: number | undefined;
    
    // Try to extract from booking event structure
    if ('person' in eventData && eventData.person) {
      person = eventData.person as typeof person;
    }
    if ('businessUnit' in eventData && eventData.businessUnit) {
      businessUnit = eventData.businessUnit as typeof businessUnit;
    }
    if ('amount' in eventData && typeof eventData.amount === 'number') {
      amount = eventData.amount;
    }
    
    // If person is nested, try to get it from person property
    if (!person && 'person' in eventData) {
      const personData = (eventData as Record<string, unknown>).person;
      if (personData && typeof personData === 'object' && personData !== null) {
        person = personData as unknown as typeof person;
      }
    }
    
    // Validate required fields
    if (!person || (!person.id && !person.ssn)) {
      logger.info('BRP webhook missing person data', {
        ip: clientIP,
        event: eventType,
        hasData: !!eventData,
      });
      res.status(200).json({ success: true });
      return;
    }
    
    // Extract user identifier (prefer SSN, fallback to person ID)
    const userNumber = person.ssn || person.id?.toString() || '';
    
    // Validate user number
    if (!userNumber || userNumber.length < 2) {
      logger.info('BRP webhook invalid user number', {
        ip: clientIP,
        event: eventType,
        userNumber,
      });
      res.status(200).json({ success: true });
      return;
    }
    
    // Extract membership fee (use amount from event or default to 0)
    const membershipFee = amount ?? 0;
    
    if (membershipFee <= 0) {
      logger.info('BRP webhook invalid amount', {
        ip: clientIP,
        event: eventType,
        amount: membershipFee,
      });
      res.status(200).json({ success: true });
      return;
    }
    
    // Extract location information
    // Try businessUnit from event data first, then from person
    const locationBusinessUnit = businessUnit || person.businessUnit;
    const location = locationBusinessUnit?.name || 'unknown';
    const deviceId = locationBusinessUnit?.id?.toString() || location;
    const club = location;
    const zone = locationBusinessUnit?.name || undefined;
    
    // Emit receipt event
    eventService.emitReceipt({
      device: deviceId,
      amount: 0.01, // Fixed amount per documentation
      membershipFee: membershipFee,
      user: userNumber,
      location: location,
      ip: clientIP,
      club: club,
      zone: zone,
    });
    
    logger.info('BRP webhook processed successfully', {
      ip: clientIP,
      event: eventType,
      user: userNumber,
      location: location,
    });
    
    // Return 200 OK (per BRP retry policy - only non-200 responses trigger retries)
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('BRP webhook error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ip: getClientIP(req),
    });
    
    // Return 200 to prevent retries on errors
    res.status(200).json({ success: false });
  }
};

/**
 * GET /webhook
 * Legacy webhook handler for backward compatibility
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

