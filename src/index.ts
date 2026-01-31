/**
 * Welcome to Cloudflare Workers!
 *
 * This is a minimal TypeScript Worker starter.
 */

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('Hello World!');
  },
};

export interface Env {
  // Environment bindings will be added here as we progress
}
