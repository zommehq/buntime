# Local Development

## Prerequisites

- Bun 1.3+
- Workspace dependencies installed (`bun install` at repo root)

## Recommended Workspace Flow

From monorepo root:

```bash
bun install
bun run --filter @buntime/vault lint:types
bun run --filter @buntime/vault test
```

Run the full runtime stack (runtime + plugins) from monorepo root:

```bash
bun dev
```

Vault is loaded from `apps/vault` through `RUNTIME_WORKER_DIRS`.

## Environment Setup

Example env file:

```bash
cp apps/vault/server/.env.example apps/vault/server/.env
```

Main variables:

- `PGLITE_PATH=./pg_data` for local embedded database.
- `DATABASE_URL=...` for external PostgreSQL.
- `VAULT_MASTER_KEY=...` for secret encryption/decryption.

## Database Mode Precedence

Vault uses this order:

1. If `PGLITE_PATH` is set: use PGlite.
2. Otherwise: use `x-database-url` (if provided by runtime).
3. Otherwise: use `DATABASE_URL`.

This behavior is implemented in `server/helpers/drizzle.ts`.

## Local Migration

For local PGlite development:

```bash
PGLITE_PATH=./apps/vault/server/pg_data bun run --filter @buntime/vault server/migrate.ts
```

For PostgreSQL environments, migrations are driven by Drizzle migration commands and runtime deployment flow.

## Common Commands

Run from monorepo root:

```bash
# Build worker + SPA
bun run --filter @buntime/vault build

# Type check
bun run --filter @buntime/vault lint:types

# Format + type check
bun run --filter @buntime/vault lint

# Tests
bun run --filter @buntime/vault test
```

## URLs (When Served by Buntime)

- SPA: `/vault`
- API root in app context: `/vault/api`
- Vault endpoints: `/vault/api/vault/*`
- OpenAPI JSON: `/vault/openapi.json`
- Scalar docs: `/vault/docs`

## Local Auth Helpers

- Token sources: `Authorization: Bearer <jwt>` first, then `HYPER-AUTH-TOKEN` cookie.
- Dev helper endpoint: `GET /vault/api/set-cookie?token=<jwt>` sets `HYPER-AUTH-TOKEN`.
- In dev with `PGLITE_PATH` and no token, middleware uses fixed dev tenant fallback.

## Troubleshooting

- `VaultNotConfiguredException`: set `VAULT_MASTER_KEY` with a base64-encoded 32-byte key.
- `DATABASE_URL or connectionString is required`: set `DATABASE_URL` or `PGLITE_PATH`.
- Unauthorized responses in non-dev mode: provide auth token with `hyper_cluster_space` claim.
- `Invalid token or missing hyper_cluster_space`: verify JWT payload has `hyper_cluster_space`.
