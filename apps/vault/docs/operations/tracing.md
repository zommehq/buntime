# Tracing

Vault includes OpenTelemetry helper utilities in `server/utils/tracing.ts`.

## Correlation Headers

The runtime can forward correlation headers into the worker request:

- `x-worker-id`
- `x-request-id`
- `x-tenant-id`
- `x-user-id` (when available)

`getCorrelationAttrs(request)` maps these into span attributes:

- `worker.id`
- `request.id`
- `tenant.id`
- `user.id`

## Available Helpers

- `getTracer()`
- `getCorrelationAttrs(request)`
- `withSpan(request, spanName, callback)`
- `tracingMiddleware(ctx, next)`
- `autoTracing(ctx, next)`

## withSpan Example

```ts
import { withSpan } from "@/utils/tracing.ts";

app.post("/api/vault", async (ctx) => {
  return withSpan(ctx.req.raw, "create_parameter", async (span) => {
    span.setAttribute("parameter.key", "db.password");
    // business logic
    return ctx.json({ ok: true });
  });
});
```

## autoTracing Middleware

`autoTracing` wraps each request in a span named:

- `HTTP {method} {pathname}`

and records:

- correlation attributes
- request URL/path/method
- response status code

It is already wired in `server/index.ts`.

## Operational Guidance

- Use `withSpan` for business operations that need explicit visibility.
- Keep attribute names stable (`parameter.key`, `parameter.id`, etc.) to simplify dashboards.
- Do not attach secret plaintext to spans.
