/**
 * GitHub webhook signature verification
 */

import { verifyHmacSha256 } from '../../crypto/hmac';

/**
 * Verify GitHub webhook signature
 * @param request The incoming request
 * @param body The raw body string for signature verification
 * @param secret The GitHub webhook secret
 * @returns true if signature is valid, false otherwise
 */
export async function verifyGitHubSignature(
  request: Request,
  body: string,
  secret: string
): Promise<boolean> {
  // Get X-Hub-Signature-256 header
  const signatureHeader = request.headers.get('X-Hub-Signature-256');

  // Return false if header is missing
  if (!signatureHeader) {
    return false;
  }

  // Parse signature (format: sha256=<hex>)
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const signature = parts[1];

  // Verify using HMAC-SHA256
  return await verifyHmacSha256(secret, body, signature);
}
