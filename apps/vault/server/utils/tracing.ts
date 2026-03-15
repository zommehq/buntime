/**
 * OpenTelemetry Tracing Utilities for User Workers
 *
 * Provides helper functions to create custom spans with correlation attributes
 * extracted from headers injected by the Edge Runtime Main Worker.
 *
 * The Edge Runtime automatically injects these headers:
 * - x-worker-id: UUID of the worker processing the request
 * - x-request-id: UUID of the request (for end-to-end tracing)
 * - x-tenant-id: Tenant identifier (multi-tenancy)
 *
 * @example
 * ```typescript
 * import { withSpan } from "@/utils/tracing.ts";
 *
 * app.get("/api/users", async (ctx) => {
 *   return withSpan(ctx.req.raw, "fetch_users", async (span) => {
 *     span.setAttribute("query.limit", 100);
 *     const users = await db.select().from(usersTable).limit(100);
 *     span.setAttribute("result.count", users.length);
 *     return ctx.json(users);
 *   });
 * });
 * ```
 */

import { type Attributes, type Span, type Tracer, trace } from "@opentelemetry/api";
import type { Context } from "hono";
import { APP_NAME, APP_VERSION } from "@/constants.ts";

/**
 * Correlation attributes extracted from request headers
 */
export interface CorrelationAttributes {
  "worker.id"?: string;
  "request.id"?: string;
  "tenant.id"?: string;
  "user.id"?: string;
}

/**
 * Get the global tracer instance
 *
 * The tracer is automatically configured by the Edge Runtime via otelConfig.
 * This function simply retrieves the active tracer.
 */
export function getTracer(): Tracer {
  return trace.getTracer(APP_NAME, APP_VERSION);
}

/**
 * Extract correlation attributes from request headers
 *
 * These headers are automatically injected by the Edge Runtime Main Worker
 * at server/routes/worker/helpers/clone-request.ts
 *
 * @param request - The Request object from Hono context
 * @returns Correlation attributes as a key-value object
 */
export function getCorrelationAttrs(request: Request): CorrelationAttributes {
  const attrs: CorrelationAttributes = {};

  const workerId = request.headers.get("x-worker-id");
  const requestId = request.headers.get("x-request-id");
  const tenantId = request.headers.get("x-tenant-id");
  const userId = request.headers.get("x-user-id"); // If available from auth

  if (workerId) attrs["worker.id"] = workerId;
  if (requestId) attrs["request.id"] = requestId;
  if (tenantId) attrs["tenant.id"] = tenantId;
  if (userId) attrs["user.id"] = userId;

  return attrs;
}

/**
 * Execute a function within a custom span with correlation attributes
 *
 * This helper automatically:
 * 1. Extracts correlation attributes from request headers
 * 2. Creates a new span with the given name
 * 3. Adds correlation attributes to the span
 * 4. Executes the callback function
 * 5. Records errors if any occur
 * 6. Ends the span
 *
 * @param request - The Request object from Hono context
 * @param spanName - Name of the span (e.g., "fetch_users", "process_order")
 * @param callback - Async function to execute within the span
 * @returns The result of the callback function
 *
 * @example
 * ```typescript
 * return withSpan(ctx.req.raw, "create_parameter", async (span) => {
 *   span.setAttribute("parameter.key", data.key);
 *   const [parameter] = await db.insert(parametersTable).values(data).returning();
 *   span.setAttribute("parameter.id", parameter.id);
 *   return ctx.json(parameter);
 * });
 * ```
 */
export function withSpan<T>(
  request: Request,
  spanName: string,
  callback: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const correlationAttrs = getCorrelationAttrs(request);

  return tracer.startActiveSpan(
    spanName,
    { attributes: correlationAttrs as Attributes },
    async (span) => {
      try {
        const result = await callback(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: String(error) }); // ERROR
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Hono middleware to add correlation attributes to context
 *
 * This middleware extracts correlation attributes and stores them in the
 * Hono context for easy access in route handlers.
 *
 * @example
 * ```typescript
 * import { tracingMiddleware } from "@/utils/tracing.ts";
 *
 * const app = new Hono()
 *   .use(tracingMiddleware)
 *   .get("/api/users", (ctx) => {
 *     const attrs = ctx.get("correlation");
 *     console.log("Request ID:", attrs["request.id"]);
 *     return ctx.json({ users: [] });
 *   });
 * ```
 */
export function tracingMiddleware(ctx: Context, next: () => Promise<void>) {
  const correlationAttrs = getCorrelationAttrs(ctx.req.raw);
  ctx.set("correlation", correlationAttrs);
  return next();
}

/**
 * Create a span for the current request automatically
 *
 * This middleware creates a span for each HTTP request with:
 * - Span name: "HTTP {method} {pathname}"
 * - Correlation attributes from headers
 * - HTTP method, path, and status code attributes
 *
 * @example
 * ```typescript
 * import { autoTracingMiddleware } from "@/utils/tracing.ts";
 *
 * const app = new Hono()
 *   .use(autoTracingMiddleware)
 *   .get("/api/users", async (ctx) => {
 *     // Span is automatically created for this request
 *     return ctx.json({ users: [] });
 *   });
 * ```
 */
export function autoTracing(ctx: Context, next: () => Promise<void>) {
  const correlationAttrs = getCorrelationAttrs(ctx.req.raw);
  const tracer = getTracer();
  const url = new URL(ctx.req.url);

  const spanName = `HTTP ${ctx.req.method} ${url.pathname}`;

  return tracer.startActiveSpan(
    spanName,
    {
      attributes: {
        ...correlationAttrs,
        "http.method": ctx.req.method,
        "http.target": url.pathname,
        "http.url": ctx.req.url,
      },
    },
    async (span) => {
      try {
        await next();
        span.setAttribute("http.status_code", ctx.res.status);
        span.setStatus({ code: ctx.res.status >= 400 ? 2 : 1 });
      } catch (error) {
        span.setStatus({ code: 2, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
