# Authentication and Multi-Tenancy

Vault uses request token context to resolve tenant and actor metadata. JWT signature validation is expected upstream (gateway/runtime), while this app decodes payload claims for routing and auditing.

## Token Sources

Token extraction order:

1. `Authorization: Bearer <token>`
2. `HYPER-AUTH-TOKEN` cookie

If no token is available, Vault returns `401` unless development bypass applies.

## Required JWT Claim

The decoded payload must include:

- `hyper_cluster_space` (tenant UUID)

Optional actor claims used by audit log:

- `email`
- `preferred_username`

## Tenant and Actor Context

Middleware sets Hono context values:

- `db`: Drizzle connection
- `tenantId`: from `x-tenant-id` header or token `hyper_cluster_space`
- `hyperClusterSpace`: token `hyper_cluster_space`
- `actorEmail`: token `email`
- `actorUsername`: token `preferred_username`

## Database Selection

Connection resolution order:

1. `x-database-url` header (runtime-injected tenant DB)
2. `DATABASE_URL`
3. If `PGLITE_PATH` is set, PGlite mode takes precedence in Drizzle helper

## Development Bypass (PGlite)

When all conditions are true:

- `NODE_ENV != production`
- `PGLITE_PATH` is set
- no token is provided

Vault allows request execution with:

- tenant UUID = `DEV_TENANT_UUID`
- actor = `dev@localhost` / `dev-user`

This bypass is local-development only and should not be used in production.

## Secret Security Rules

- Secrets are encrypted with AES-256-GCM before persistence.
- Secret plaintext is never persisted in audit rows.
- Audit stores `oldValueHash` (SHA-256) when applicable.
- `GET /:id/reveal` returns plaintext only on explicit request and records `revealed` action.

## Audit Actions

Secret operations produce audit entries:

- `created`
- `updated`
- `deleted`
- `revealed`
- `rotated`

## Recommended Production Controls

- Always set strong `VAULT_MASTER_KEY` (32-byte base64).
- Enforce JWT signature validation at gateway level.
- Restrict `x-database-url` injection to trusted runtime components.
- Disable dev flows and avoid `PGLITE_PATH` in production.

