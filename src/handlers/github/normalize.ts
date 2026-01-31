/**
 * GitHub webhook event normalization
 */

import { NormalizedEvent } from '../../types';

/**
 * Normalize GitHub webhook into standard format
 * @param request The incoming request
 * @param payload The parsed JSON payload
 * @returns Normalized event
 */
export async function normalizeGitHubEvent(
  request: Request,
  payload: any
): Promise<NormalizedEvent> {
  // Parse X-GitHub-Event header for event type
  const githubEvent = request.headers.get('X-GitHub-Event') || 'unknown';

  // Parse X-GitHub-Delivery header for delivery ID
  const deliveryId = request.headers.get('X-GitHub-Delivery') || '';

  // Map GitHub event to normalized format
  const eventType = mapGitHubEvent(githubEvent);

  // Extract common metadata
  const metadata: any = {
    deliveryId,
    githubEvent,
  };

  // Extract repo name if available
  if (payload.repository?.full_name) {
    metadata.repo = payload.repository.full_name;
  }

  // Extract action if available
  if (payload.action) {
    metadata.action = payload.action;
  }

  // Extract sender if available
  if (payload.sender?.login) {
    metadata.sender = payload.sender.login;
  }

  // Add event-specific metadata
  switch (githubEvent) {
    case 'push':
      if (payload.ref) {
        metadata.ref = payload.ref;
      }
      if (payload.commits) {
        metadata.commitCount = payload.commits.length;
      }
      break;

    case 'star':
      if (payload.starred_at) {
        metadata.starredAt = payload.starred_at;
      }
      break;

    case 'pull_request':
      if (payload.pull_request) {
        metadata.prNumber = payload.pull_request.number;
        metadata.prTitle = payload.pull_request.title;
      }
      break;

    case 'issues':
      if (payload.issue) {
        metadata.issueNumber = payload.issue.number;
        metadata.issueTitle = payload.issue.title;
      }
      break;
  }

  // Generate event ID (will be replaced with proper UUID in later stories)
  const id = `evt_github_${deliveryId || Date.now()}`;

  return {
    id,
    source: 'github',
    eventType,
    timestamp: new Date().toISOString(),
    payload,
    metadata,
  };
}

/**
 * Map GitHub event names to normalized format
 */
function mapGitHubEvent(githubEvent: string): string {
  const eventMap: Record<string, string> = {
    push: 'github.push',
    star: 'github.star',
    pull_request: 'github.pull_request',
    issues: 'github.issues',
    issue_comment: 'github.issue_comment',
    pull_request_review: 'github.pull_request_review',
    release: 'github.release',
    fork: 'github.fork',
    watch: 'github.watch',
    create: 'github.create',
    delete: 'github.delete',
  };

  return eventMap[githubEvent] || `github.${githubEvent}`;
}
