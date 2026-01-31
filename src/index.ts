/**
 * WebhookRelay - Cloudflare Worker
 * Catches webhooks from GitHub, Stripe, Vercel, and custom sources
 */

import { Router } from './router';

// Initialize router
const router = new Router();

// Add webhook catch endpoint
router.add('/catch/:source', async (request, match, env, ctx) => {
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

  // Parse JSON body with error handling
  let body: any;
  try {
    const text = await request.text();

    // Handle empty body
    if (!text || text.trim() === '') {
      body = {};
    } else {
      body = JSON.parse(text);
    }
  } catch (error) {
    // Return 400 for malformed JSON
    return new Response(
      JSON.stringify({ status: 'error', error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Return accepted status with source
  return new Response(
    JSON.stringify({ status: 'accepted', source: match.params.source }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
  },
};

export interface Env {
  // Environment bindings will be added here as we progress
}
