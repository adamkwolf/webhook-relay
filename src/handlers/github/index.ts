/**
 * GitHub webhook handler
 */

import { WebhookHandler, NormalizedEvent } from '../../types';
import { verifyGitHubSignature } from './verify';
import { normalizeGitHubEvent } from './normalize';

export class GitHubHandler implements WebhookHandler {
  async verify(request: Request, body: string, env: any): Promise<boolean> {
    const secret = env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return false;
    }

    return await verifyGitHubSignature(request, body, secret);
  }

  async normalize(request: Request, payload: any): Promise<NormalizedEvent> {
    return await normalizeGitHubEvent(request, payload);
  }
}
