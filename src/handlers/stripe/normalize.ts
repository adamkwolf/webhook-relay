/**
 * Stripe webhook event normalization
 */

import { NormalizedEvent } from '../../types';

/**
 * Normalize Stripe webhook into standard format
 * @param request The incoming request
 * @param payload The parsed JSON payload
 * @returns Normalized event
 */
export async function normalizeStripeEvent(
  request: Request,
  payload: any
): Promise<NormalizedEvent> {
  // Stripe webhooks have a consistent structure with event.type field
  const stripeEventType = payload.type || 'unknown';

  // Map Stripe event type to normalized format
  const eventType = mapStripeEvent(stripeEventType);

  // Extract common metadata
  const metadata: any = {
    stripeEventType,
  };

  // Add event ID from Stripe if available
  if (payload.id) {
    metadata.stripeEventId = payload.id;
  }

  // Extract event-specific metadata based on event type
  // Focus on payment-related events
  if (stripeEventType.startsWith('payment_intent.')) {
    const paymentIntent = payload.data?.object;
    if (paymentIntent) {
      if (paymentIntent.amount !== undefined) {
        metadata.amount = paymentIntent.amount;
      }
      if (paymentIntent.currency) {
        metadata.currency = paymentIntent.currency;
      }
      if (paymentIntent.customer) {
        metadata.customerId = paymentIntent.customer;
      }
      if (paymentIntent.status) {
        metadata.status = paymentIntent.status;
      }
    }
  } else if (stripeEventType.startsWith('charge.')) {
    const charge = payload.data?.object;
    if (charge) {
      if (charge.amount !== undefined) {
        metadata.amount = charge.amount;
      }
      if (charge.currency) {
        metadata.currency = charge.currency;
      }
      if (charge.customer) {
        metadata.customerId = charge.customer;
      }
      if (charge.status) {
        metadata.status = charge.status;
      }
    }
  } else if (stripeEventType.startsWith('customer.')) {
    const customer = payload.data?.object;
    if (customer) {
      if (customer.id) {
        metadata.customerId = customer.id;
      }
      if (customer.email) {
        metadata.customerEmail = customer.email;
      }
    }
  } else if (stripeEventType.startsWith('invoice.')) {
    const invoice = payload.data?.object;
    if (invoice) {
      if (invoice.amount_due !== undefined) {
        metadata.amount = invoice.amount_due;
      }
      if (invoice.currency) {
        metadata.currency = invoice.currency;
      }
      if (invoice.customer) {
        metadata.customerId = invoice.customer;
      }
      if (invoice.status) {
        metadata.status = invoice.status;
      }
    }
  }

  // Generate event ID (will be replaced with proper UUID in later stories)
  const id = `evt_stripe_${payload.id || Date.now()}`;

  return {
    id,
    source: 'stripe',
    eventType,
    timestamp: new Date().toISOString(),
    payload,
    metadata,
  };
}

/**
 * Map Stripe event names to normalized format
 */
function mapStripeEvent(stripeEvent: string): string {
  const eventMap: Record<string, string> = {
    'payment_intent.succeeded': 'stripe.payment.succeeded',
    'payment_intent.payment_failed': 'stripe.payment.failed',
    'payment_intent.created': 'stripe.payment.created',
    'payment_intent.canceled': 'stripe.payment.canceled',
    'charge.succeeded': 'stripe.charge.succeeded',
    'charge.failed': 'stripe.charge.failed',
    'charge.refunded': 'stripe.charge.refunded',
    'customer.created': 'stripe.customer.created',
    'customer.updated': 'stripe.customer.updated',
    'customer.deleted': 'stripe.customer.deleted',
    'invoice.paid': 'stripe.invoice.paid',
    'invoice.payment_failed': 'stripe.invoice.payment_failed',
    'invoice.created': 'stripe.invoice.created',
    'checkout.session.completed': 'stripe.checkout.completed',
    'checkout.session.expired': 'stripe.checkout.expired',
  };

  return eventMap[stripeEvent] || `stripe.${stripeEvent}`;
}
