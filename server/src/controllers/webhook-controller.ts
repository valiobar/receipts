import { Request, Response } from 'express';
import { ReceiptEventData, eventService } from '../services/EventService';
import { businessUnitService } from '../services/BusinessUnitService';
import { brpUserService } from '../services/BRPUserService';
import { deviceService } from '../services/DeviceService';
import { isIPWhitelisted, getClientIP } from '../utils/ip-whitelist';
import logger from '../config/winston';
import {
  BRPWebhookPayload,
  BRPEventType,
  BRPBookingEventData,
  BRPPassageTryData,
  RECEIPT_TRIGGER_EVENTS,
} from '../types/brp-events';
import type { BRPSubscription } from '../types/brp-api';

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
    const eventData = payload.data;
    
    // Extract required fields for receipt processing
    // Handle different data structures based on event type
    let person: { id?: number; } | undefined;
    let businessUnit: { id?: number;  } | undefined;
    
    // Handle PASSAGE_TRY event structure
    if (eventType === BRPEventType.PASSAGE_TRY) {
      const passageTryData = eventData as BRPPassageTryData;
      if (passageTryData.passageTry) {
        person = passageTryData.passageTry.person;
        businessUnit = passageTryData.passageTry.businessUnit;
      }
    } else {
      // Handle booking event structure and other event types
      const bookingData = eventData as BRPBookingEventData | Record<string, unknown>;
      if ('person' in bookingData && bookingData.person) {
        person = bookingData.person as typeof person;
      }
      if ('businessUnit' in bookingData && bookingData.businessUnit) {
        businessUnit = bookingData.businessUnit as typeof businessUnit;
      }
    }

    // Validate required fields
    if (!person || (!person.id)) {
      logger.info('BRP webhook missing person data', {
        ip: clientIP,
        event: eventType,
        hasData: !!eventData,
      });
      res.status(200).json({ success: true });
      return;
    }

    // Check for Pulse Club subscription before creating receipt event
    let pulseClubSubscription: BRPSubscription | undefined;
    if (person?.id && typeof person.id === 'number') {
      try {
        const subscription = await brpUserService.getPulseClubSubscription(person.id);
        if (!subscription) {
          logger.info('No Pulse Club subscription found, skipping receipt command creation', {
            personId: person.id,
            event: eventType,
            location: businessUnit?.id || 'unknown',
          });
          // Return success to prevent BRP retries
          res.status(200).json({ success: true });
          return;
        }
        pulseClubSubscription = subscription;
        logger.debug('Pulse Club subscription confirmed, proceeding with receipt creation', {
          personId: person.id,
          subscriptionId: subscription.id,
        });
      } catch (error) {
        // Fail open: if subscription check fails, proceed with receipt event
        logger.error('Error checking Pulse Club subscription, proceeding with receipt creation', {
          personId: person.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with receipt event emission (pulseClubSubscription remains undefined)
      }
    }

    // Extract location information
    // Try businessUnit from event data first, then from person
    const locationBusinessUnit = businessUnit;
    const location = locationBusinessUnit?.id || 'unknown';
    
    // Map location ID to business unit name for club property
    const club = businessUnitService.getNameById(location);
    
    // Get device ID from database by location
    let deviceId = 'unknown';
    try {
      const locationStr = location.toString();
      const devices = await deviceService.getAllDevices({ location: locationStr });
      if (devices.length > 0) {
        deviceId = devices[0].deviceId;
        logger.debug('Device found by location', {
          location: locationStr,
          deviceId,
        });
      } else {
        // Fallback: try to find device by club name
        if (club && club !== 'unknown') {
          const devicesByClub = await deviceService.getAllDevices({ location: club });
          if (devicesByClub.length > 0) {
            deviceId = devicesByClub[0].deviceId;
            logger.debug('Device found by club name', {
              club,
              deviceId,
            });
          } else {
            logger.warn('No device found for location', {
              location: locationStr,
              club,
            });
          }
        } else {
          logger.warn('No device found for location', {
            location: locationStr,
            club,
          });
        }
      }
    } catch (error) {
      logger.error('Error fetching device by location', {
        location: location.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with 'unknown' deviceId
    }
    
    const receiptEventData: ReceiptEventData = {
      device: deviceId,
      amount: 2, // Fixed amount per documentation
      membershipFee: 2,
      user: person.id?.toString() || 'unknown',
      location: location.toString(),
      club: club,
      pulseClubSubscription, // Pass subscription data through event
    };
   
    logger.info('receiptEventData', receiptEventData);
    // Emit receipt event
    eventService.emitReceipt(receiptEventData);
    
    logger.info('BRP webhook processed successfully', {
      
      event: eventType,
      user: person.id,
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
      club: club || 'unknown',
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

