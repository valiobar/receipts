/**
 * BRP Main API Types
 * Based on BRP Main API documentation
 */

/**
 * BRP Authentication Token
 */
export interface BRPAuthToken {
  token: string;
  expiresAt?: number; // Unix timestamp in milliseconds
  refreshToken?: string;
}

/**
 * BRP Login Request
 */
export interface BRPLoginRequest {
  username: string;
  password: string;
}

/**
 * BRP Login Response Data
 * The actual data object returned by the API
 */
export interface BRPLoginResponseData {
  roles: string[];
  username: string;
  access_token: string;
  expires_in: number; // Seconds until expiration
  refresh_token: string;
  token_type: string; // Usually "Bearer"
  [key: string]: unknown; // Allow additional fields
}

/**
 * BRP Login Response
 * Response format from POST /api/ver3/auth/login
 * The API may return the data directly or wrapped in a "data" object
 */
export type BRPLoginResponse = BRPLoginResponseData | { data: BRPLoginResponseData };

/**
 * BRP Refresh Token Request
 * Request format for POST /api/ver3/auth/refresh
 * TODO: Verify exact request format from BRP API documentation
 */
export interface BRPRefreshRequest {
  refreshToken?: string;
  token?: string;
  refresh_token?: string;
  grant_type?: string; // May be 'refresh_token'
  [key: string]: unknown; // Allow additional fields
}

/**
 * BRP Customer Type
 */
export interface BRPCustomerType {
  id: number;
  name: string;
}

/**
 * BRP Consent
 */
export interface BRPConsent {
  id: number;
  name: string;
}

/**
 * BRP Address (for shipping/billing addresses)
 */
export interface BRPAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  [key: string]: unknown;
}

/**
 * BRP Organization
 */
export interface BRPOrganization {
  id: number;
  name: string;
  [key: string]: unknown;
}

/**
 * BRP Customer
 * Response format from GET /api/ver3/customers/{id}
 */
export interface BRPCustomer {
  id: number;
  firstName: string;
  lastName: string;
  sex: string | null;
  ssn: string | null;
  birthDate: string | null;
  shippingAddress: BRPAddress | null;
  billingAddress: BRPAddress | null;
  email: string | null;
  mobilePhone: string | null;
  businessUnit: BRPBusinessUnit;
  customerType: BRPCustomerType;
  customerTypeEndDate: string | null;
  customerNumber: string;
  cardNumber: string | null;
  acceptedBookingTerms: boolean;
  acceptedSubscriptionTerms: boolean;
  acceptedRegistrationTerms: string | null;
  profileImage: string | null;
  benefitStatus: unknown | null;
  organization: BRPOrganization | null;
  organizationConnectionEndDate: string | null;
  memberJoinDate: string | null;
  allowMassSendEmail: boolean;
  allowMassSendMail: boolean;
  allowMassSendSms: boolean;
  consents: BRPConsent[];
  temporary: unknown | null;
  lastPasswordChangedTime: string | null;
  justFaceLocationId: string | null;
  familyMembers: unknown | null;
  suspended: boolean;
  hasMembership: boolean;
}

/**
 * BRP Termination Time
 */
export interface BRPTerminationTime {
  numberOf: number;
  unit: string;
}

/**
 * BRP Business Unit
 */
export interface BRPBusinessUnit {
  id: number;
  name: string;
  location: string;
  companyNameForInvoice: string;
}

/**
 * BRP Subscription Product
 */
export interface BRPSubscriptionProduct {
  id: number;
  name: string;
}

/**
 * BRP Subscription User
 */
export interface BRPSubscriptionUser {
  id: number;
  firstName: string;
  lastName: string;
}

/**
 * BRP Subscription Payer
 */
export interface BRPSubscriptionPayer {
  id: number;
  firstName: string;
  lastName: string;
}

/**
 * BRP Payment Option
 */
export interface BRPPaymentOption {
  id: number;
  name: string;
}/**
 * BRP Price
 */
export interface BRPPrice {
  amount: number;
  currency: string;
}/**
 * BRP Customer Subscription
 * Response format from GET /api/ver3/customers/{customer}/subscriptions
 */
export interface BRPSubscription {
  id: number;
  start: string;
  end: string;
  boundUntil: string;
  debitedUntil: string;
  expirationDay: string;
  terminationTime: BRPTerminationTime;
  businessUnit: BRPBusinessUnit;
  subscriptionProduct: BRPSubscriptionProduct;
  users: BRPSubscriptionUser[];
  payer: BRPSubscriptionPayer;
  recruitedBy: BRPSubscriptionUser | null;
  statuses: unknown[];
  actions: string[];
  freeze: unknown | null;
  subscriptionBookingId: number;
  paymentOption: BRPPaymentOption;
  priceWarrantyDay: string | null;
  newPriceDay: string | null;
  newPrice: BRPPrice | null;
  price: BRPPrice;
}/**
 * BRP Customer Subscriptions Response
 * The API may return the data directly as an array or wrapped in a "data" object
 */
export type BRPCustomerSubscriptionsResponse = BRPSubscription[] | { data: BRPSubscription[] };
