# Database

## ORM and Migrations

- **ORM:** Drizzle ORM
- **Migration tool:** drizzle-kit
- **Config file:** `drizzle.config.ts` (project root)
- **Migrations folder:** `server/migrations/`
- **Seeds folder:** `server/seeds/` (dev only, plugin-migrations pattern)
- **Schema definition:** `server/routes/parameters/parameters.schema.ts`

## Schema

All tables live in the PostgreSQL schema `"parameters"` (defined in `server/constants.ts` as `DATABASE_SCHEMA`).

### Reference Tables (read-only)

| Table | Purpose |
|---|---|
| `country` | Countries |
| `state` | States/provinces (FK → country) |
| `region` | Regions (FK → state) |
| `cluster` | Physical clusters (FK → region) |
| `client_category` | Tenant client categories |
| `client` | Tenant clients (FK → state, client_category) |
| `cluster_space_client` | Tenant instances — the main tenancy table |

### Core Domain Table

**`cluster_space_parameter`** — the parameters table:

| Column | Type | Notes |
|---|---|---|
| `cluster_space_parameter_id` | bigint PK | Auto-generated |
| `cluster_space_parameter_parent_id` | bigint FK (self) | null = root node |
| `cluster_space_client_id` | bigint FK | Ties to tenant |
| `description` | text NOT NULL | Human-readable label |
| `parameter_key` | varchar(256) NOT NULL | Machine key |
| `parameter_value` | text | Nullable, stores the value |
| `parameter_type` | varchar(32) NOT NULL | Numeric code as string ("0"-"5") |

**Unique constraint:** `(cluster_space_client_id, cluster_space_parameter_parent_id, parameter_key)` — keys are unique within a parent scope per tenant.

## Parameter Types

Stored as numeric string in `parameter_type` column:

| Name | Value | Description |
|---|---|---|
| `GROUP` | 0 | Container/folder node, no value |
| `STRING` | 1 | Plain text |
| `NUMBER` | 2 | Numeric |
| `BOOLEAN` | 3 | Stored as `"true"` / `"false"` |
| `JSON` | 4 | JSON blob |
| `CODE` | 5 | Code snippet |

Conversion helpers: `getParameterTypeName(numericValue)` and `getParameterTypeValue(name)` in `server/shared/enums/parameters-enum.ts`.

## Connection Management

- Primary: PostgreSQL via `postgres` driver (`DATABASE_URL` env var)
- Alternative: PGlite for local/embedded development (`PGLITE_PATH` env var)
- Per-tenant DB possible via `x-database-url` header (parsed in middleware)
- Connections cached in `QuickLRU` (max 500, 8h TTL)

## Commands

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Run pending migrations
bun run db:check      # Check migration status
bun run db:seed       # Run migrations + seeds on PGlite (dev only)
```

## Seeds (Dev Only)

Seeds live in `server/seeds/` and follow the [plugin-migrations](../../buntime-plugins/plugin-migrations) pattern:
- Numbered files for execution order: `01-dev-tenant.ts`, `02-sample-data.ts`, etc.
- Each file exports a default async function receiving the PGlite `db` instance
- Seeds must be idempotent (use `ON CONFLICT DO NOTHING` or similar)
- The runner (`scripts/seed.ts`) discovers and executes them alphabetically
