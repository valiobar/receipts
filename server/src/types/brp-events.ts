/**
 * BRP Event API Types
 * Based on BRP Event API documentation
 */

/**
 * Available BRP event types
 */
export enum BRPEventType {
  BOOKED_FROM_WAITING_LIST = 'BOOKED_FROM_WAITING_LIST',
  BOOKED_ON_CLASS = 'BOOKED_ON_CLASS',
  ENTRY_BOOKING_DEBITED = 'ENTRY_BOOKING_DEBITED',
  EVENT_BOOKING_DEBITED = 'EVENT_BOOKING_DEBITED',
  GROUP_ACTIVITY_ARRIVED = 'GROUP_ACTIVITY_ARRIVED',
  GROUP_ACTIVITY_BOOKING_DEBITED = 'GROUP_ACTIVITY_BOOKING_DEBITED',
  ITEM_BOOKING_DEBITED = 'ITEM_BOOKING_DEBITED',
  MEMBER = 'MEMBER',
  NO_SHOW_STATUS = 'NO_SHOW_STATUS',
  PASSAGE_TRY = 'PASSAGE_TRY',
  PERSON_CREATED = 'PERSON_CREATED',
  PERSON_GROUP_CHANGED = 'PERSON_GROUP_CHANGED',
  PERSON_INFORMATION_CHANGED = 'PERSON_INFORMATION_CHANGED',
  SERVICE_BOOKING_DEBITED = 'SERVICE_BOOKING_DEBITED',
  SUBSCRIPTION_BOOKING_DEBITED = 'SUBSCRIPTION_BOOKING_DEBITED',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_DEBITED_UNTIL_CHANGED = 'SUBSCRIPTION_DEBITED_UNTIL_CHANGED',
  SUBSCRIPTION_REFERRED_FROM_A_FRIEND = 'SUBSCRIPTION_REFERRED_FROM_A_FRIEND',
  SUBSCRIPTION_TERMINATED = 'SUBSCRIPTION_TERMINATED',
  USER_ACTIVITY = 'USER_ACTIVITY',
  VALUE_CARD_BOOKING_DEBITED = 'VALUE_CARD_BOOKING_DEBITED',
  WORKOUT = 'WORKOUT',
}

/**
 * BRP Business Unit
 */
export interface BRPBusinessUnit {
  id: number;
  name: string;
  timeZone: string;
}

/**
 * BRP Person
 */
export interface BRPPerson {
  id: number;
  firstName: string;
  lastName: string;
  ssn: string;
  personGroups?: BRPPersonGroup[];
  email?: string;
  gender?: number;
  memberJoin?: string;
  memberEnd?: string;
  staff?: boolean;
  businessUnit?: BRPBusinessUnit;
  mobilePhone?: BRPPhone;
  address?: BRPAddress;
  organization?: BRPOrganization;
}

/**
 * BRP Person Group
 */
export interface BRPPersonGroup {
  id: number;
  name: string;
}

/**
 * BRP Phone
 */
export interface BRPPhone {
  countryCode?: string;
  number?: string;
}

/**
 * BRP Address
 */
export interface BRPAddress {
  city?: string;
  street?: string;
  postalCode?: string;
  careOf?: string;
  country?: {
    alpha3?: string;
  };
}

/**
 * BRP Organization
 */
export interface BRPOrganization {
  id: number;
  name: string;
}

/**
 * BRP Product
 */
export interface BRPProduct {
  id: number;
  name: string;
  productSubtype: number;
  noCheckOnDebitedUntil?: boolean;
  productLabels?: BRPProductLabel[];
  availableFor?: number;
  givesMembership: number;
}

/**
 * BRP Product Label
 */
export interface BRPProductLabel {
  id: number;
  name: string;
  description: string;
  availableFor: number;
}

/**
 * BRP Subscription
 */
export interface BRPSubscription {
  id: number;
  created: string;
  start: string;
  end?: string;
  debitedUntil?: string;
  product: BRPProduct;
  users: BRPPerson[];
  businessUnit: BRPBusinessUnit;
  payer?: BRPPerson;
  contractCancelDay?: string;
  terminationReason?: {
    id: number;
    name: string;
  };
}

/**
 * BRP Booking Event Data (common structure for booking events)
 */
export interface BRPBookingEventData {
  id: number;
  businessUnit?: BRPBusinessUnit;
  person?: BRPPerson;
  amount?: number;
  timePoint?: string;
  [key: string]: unknown; // Allow additional fields based on data projection
}

/**
 * BRP Webhook Payload
 * The actual structure depends on the event type and data projection
 */
export interface BRPWebhookPayload {
  event: BRPEventType;
  data: BRPBookingEventData | BRPSubscription | BRPPerson | Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Events that should trigger receipt processing
 */
export const RECEIPT_TRIGGER_EVENTS: BRPEventType[] = [
  BRPEventType.PASSAGE_TRY
];

