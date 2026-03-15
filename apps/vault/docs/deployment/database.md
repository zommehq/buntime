# Database

Vault supports two database execution modes with the same Drizzle schema and migration set.

## Modes

- Local development: PGlite (`PGLITE_PATH`).
- Runtime/production: PostgreSQL (`DATABASE_URL` or runtime-injected `x-database-url`).

## Schema and Migrations

- Drizzle config: `apps/vault/drizzle.config.ts`
- Schema files: `apps/vault/server/routes/vault/*.schema.ts`
- SQL migrations: `apps/vault/server/migrations/*`

Database schema namespace is currently fixed to:

- `parameters` (see `server/constants.ts` and `manifest.yaml`).

Main domain tables:

- `cluster_space_parameter`
- `parameter_audit_log`
- `parameter_version`

## Connection Resolution

Connection setup is implemented in `server/helpers/drizzle.ts` and `server/middleware/set-tenant-db.ts`:

1. If `PGLITE_PATH` is set, use PGlite.
2. Else use `x-database-url` header if present.
3. Else fallback to `DATABASE_URL`.

## Tenant Behavior

- Runtime can inject tenant-specific DB URL through `x-database-url`.
- Middleware also captures tenant/user context (`x-tenant-id`, JWT payload).
- In local dev with PGlite and no token, a dev tenant fallback is used.

## Migration Notes

- Runtime migration execution uses `DATABASE_SCHEMA` (`parameters`) from constants.
- `drizzle.config.ts` contains `migrations.schema: "vault"` for migration metadata handling in drizzle-kit.
- App data tables remain under `parameters`.

## Commands

From monorepo root:

```bash
# Generate migration files from schema changes
bun run --filter @buntime/vault db:generate

# Validate migration state
bun run --filter @buntime/vault db:check

# Apply migrations with drizzle-kit (Postgres-style flow)
bun run --filter @buntime/vault db:migrate
```

For local embedded DB migration script:

```bash
PGLITE_PATH=./apps/vault/server/pg_data bun run --filter @buntime/vault server/migrate.ts
```

## Seed Data

The app includes seeds under `apps/vault/server/seeds/*`.

```bash
bun run --filter @buntime/vault db:seed
```

`db:seed` sets a development `VAULT_MASTER_KEY` and uses local PGlite path by default.

Seed flow:

1. Run migrations.
2. Execute seed files in alphabetical order.
3. Seed dev tenant (`01-dev-tenant.ts`), then sample parameters and secret history (`02-sample-parameters.ts`).
