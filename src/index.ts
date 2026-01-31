/**
 * WebhookRelay - Cloudflare Worker
 * Catches webhooks from GitHub, Stripe, Vercel, and custom sources
 */

import { Router } from './router';
import { GitHubHandler } from './handlers/github';

/**
 * Centralized error handler
 */
function handleError(error: unknown): Response {
  // Log error with stack trace
  console.error('Error processing request:', error);
  if (error instanceof Error) {
    console.error('Stack:', error.stack);
  }

  // Return consistent error response
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  return new Response(
    JSON.stringify({ status: 'error', error: message }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Initialize router
const router = new Router();

// Initialize handlers
const githubHandler = new GitHubHandler();

// Add webhook catch endpoint for GitHub
router.add('/catch/github', async (request, match, env, ctx) => {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get raw body text for signature verification
  const bodyText = await request.text();

  // Verify signature
  const isValid = await githubHandler.verify(request, bodyText, env);
  if (!isValid) {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Invalid signature' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse JSON body
  let payload: any;
  try {
    if (!bodyText || bodyText.trim() === '') {
      payload = {};
    } else {
      payload = JSON.parse(bodyText);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ status: 'error', error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Normalize event
  const normalizedEvent = await githubHandler.normalize(request, payload);

  // Return normalized event (for now, later will forward to Clawdbot)
  return new Response(
    JSON.stringify(normalizedEvent),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      // Health check endpoint
      if (url.pathname === '/health' && request.method === 'GET') {
        return new Response(
          JSON.stringify({ status: 'healthy', version: '0.1.0' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Try to match route with router
      const routeResponse = await router.match(url.pathname, request, env, ctx);
      if (routeResponse) {
        return routeResponse;
      }

      // Default 404 with JSON error body
      return Router.notFound();
    } catch (error) {
      return handleError(error);
    }
  },
};

export interface Env {
  // Webhook secrets
  GITHUB_WEBHOOK_SECRET?: string;

  // More environment bindings will be added here as we progress
}
