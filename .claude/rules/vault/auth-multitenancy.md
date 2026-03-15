# Authentication and Multi-Tenancy

## Authentication

JWT tokens are decoded (without signature verification) on the server side. Signature validation is assumed to happen upstream at the Edge Runtime/gateway layer.

### Token Sources (checked in order)

1. `Authorization: Bearer <token>` header
2. `HYPER-AUTH-TOKEN` cookie

### JWT Payload Structure

```typescript
interface TokenPayload {
  hyper_cluster_space?: string;  // Tenant UUID (required for API access)
  hyper_client?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  preferred_username?: string;
  email?: string;
}
```

### Key Files

- `server/helpers/get-token.ts` — Token extraction from request
- `server/helpers/jwt.ts` — JWT decode (base64 payload parsing, no verification)
- `server/middleware/set-tenant-db.ts` — Auth middleware that sets Hono context variables

### Hono Context Variables (set by middleware)

| Variable | Type | Source |
|---|---|---|
| `db` | `Db` (Drizzle instance) | `x-database-url` header or `DATABASE_URL` env |
| `tenantId` | `string` | `x-tenant-id` header or `hyper_cluster_space` from JWT |
| `hyperClusterSpace` | `string` | `hyper_cluster_space` from JWT |

## Multi-Tenancy Model

**Shared schema, row-level isolation:**

1. All tenants share the same PostgreSQL `parameters` schema
2. Each tenant is identified by `cluster_space_uuid` (UUID from JWT's `hyper_cluster_space`)
3. Middleware resolves the UUID to a numeric `cluster_space_client_id` via the `cluster_space_client` table
4. All DB queries filter by `cluster_space_client_id`

### Optional Multi-Database Support

The middleware reads an optional `x-database-url` header, allowing the Edge Runtime to route each tenant to a different database instance. This supports both single-DB and multi-DB multi-tenancy.

The manifest declares `database.provider: resource-tenant`, signaling the Edge platform to provide per-tenant database credentials.
