/**
 * Simple URL router with parameter extraction
 */

export interface RouteMatch {
  params: Record<string, string>;
}

export type RouteHandler = (
  request: Request,
  match: RouteMatch,
  env: any,
  ctx: ExecutionContext
) => Promise<Response>;

export interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  /**
   * Add a route with parameter extraction
   * Pattern format: /catch/:source
   */
  add(pattern: string, handler: RouteHandler): void {
    // Extract parameter names from pattern
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:(\w+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    // Create regex that matches the full path
    const regex = new RegExp(`^${regexPattern}$`);

    this.routes.push({ pattern: regex, paramNames, handler });
  }

  /**
   * Match a URL path and execute the handler
   */
  async match(
    pathname: string,
    request: Request,
    env: any,
    ctx: ExecutionContext
  ): Promise<Response | null> {
    for (const route of this.routes) {
      const match = pathname.match(route.pattern);
      if (match) {
        // Extract parameters
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return await route.handler(request, { params }, env, ctx);
      }
    }

    return null; // No match found
  }

  /**
   * Create a 404 JSON error response
   */
  static notFound(message = 'Not Found'): Response {
    return new Response(
      JSON.stringify({ status: 'error', error: message }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
