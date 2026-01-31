/**
 * HMAC-SHA256 verification utilities using Web Crypto API
 * Compatible with Cloudflare Workers
 */

/**
 * Verify HMAC-SHA256 signature
 * @param secret The secret key for HMAC
 * @param payload The payload to verify
 * @param signature The signature to verify against (hex string)
 * @returns true if valid, false if invalid
 */
export async function verifyHmacSha256(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  // Handle empty inputs
  if (!secret || !payload || !signature) {
    return false;
  }

  try {
    // Encode the secret key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the payload
    const payloadData = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);

    // Convert signature buffer to hex string
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = signatureArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    return timingSafeEqual(computedSignature, signature.toLowerCase());
  } catch (error) {
    // Return false for any errors (invalid inputs, crypto failures, etc.)
    return false;
  }
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
