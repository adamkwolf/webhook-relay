/**
 * Type definitions for webhook handling
 */

/**
 * Supported webhook sources
 */
export type WebhookSource = 'github' | 'stripe' | 'vercel' | 'custom';

/**
 * Normalized event structure
 */
export interface NormalizedEvent {
  /** Unique event identifier */
  id: string;

  /** Event source (github, stripe, etc.) */
  source: WebhookSource;

  /** Event type (e.g., github.push, stripe.payment.succeeded) */
  eventType: string;

  /** ISO 8601 timestamp when event was received */
  timestamp: string;

  /** Original webhook payload */
  payload: any;

  /** Extracted metadata specific to the event type */
  metadata?: {
    /** Repository name for GitHub events */
    repo?: string;

    /** Action performed (e.g., opened, closed) */
    action?: string;

    /** User or entity that triggered the event */
    sender?: string;

    /** Amount for payment events */
    amount?: number;

    /** Currency for payment events */
    currency?: string;

    /** Customer ID for payment events */
    customerId?: string;

    /** Additional metadata fields */
    [key: string]: any;
  };
}

/**
 * Webhook handler interface
 */
export interface WebhookHandler {
  /**
   * Verify the authenticity of the webhook request
   * @param request The incoming request
   * @param body The parsed body (as string for signature verification)
   * @param env Environment variables
   * @returns true if signature is valid, false otherwise
   */
  verify(request: Request, body: string, env: any): Promise<boolean>;

  /**
   * Normalize the webhook payload into a standard format
   * @param request The incoming request
   * @param payload The parsed JSON payload
   * @returns Normalized event
   */
  normalize(request: Request, payload: any): Promise<NormalizedEvent>;
}
