/**
 * WebhookRelay - Cloudflare Worker
 * Catches webhooks from GitHub, Stripe, Vercel, and custom sources
 */

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

    // Default 404 for unknown routes
    return new Response('Not Found', { status: 404 });
  },
};

export interface Env {
  // Environment bindings will be added here as we progress
}
