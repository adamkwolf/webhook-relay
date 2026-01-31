/**
 * Stripe webhook signature verification
 */

import { verifyHmacSha256 } from '../../crypto/hmac';

/**
 * Verify Stripe webhook signature
 * @param request The incoming request
 * @param body The raw body string for signature verification
 * @param secret The Stripe webhook secret
 * @returns true if signature is valid, false otherwise
 */
export async function verifyStripeSignature(
  request: Request,
  body: string,
  secret: string
): Promise<boolean> {
  // Get Stripe-Signature header
  const signatureHeader = request.headers.get('Stripe-Signature');

  // Return false if header is missing
  if (!signatureHeader) {
    return false;
  }

  // Parse signature header (format: t=timestamp,v1=signature)
  const parts = signatureHeader.split(',');
  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signature = value;
    }
  }

  // Return false if timestamp or signature is missing
  if (!timestamp || !signature) {
    return false;
  }

  // Reject signatures older than 5 minutes (300 seconds)
  const currentTime = Math.floor(Date.now() / 1000);
  const timestampNumber = parseInt(timestamp, 10);

  if (isNaN(timestampNumber)) {
    return false;
  }

  const timeDifference = currentTime - timestampNumber;
  if (timeDifference > 300) {
    // Signature is too old
    return false;
  }

  // Also reject signatures from the future (allow 5 minute clock skew)
  if (timeDifference < -300) {
    return false;
  }

  // Construct signed payload: timestamp.body
  const signedPayload = `${timestamp}.${body}`;

  // Verify using HMAC-SHA256
  return await verifyHmacSha256(secret, signedPayload, signature);
}
