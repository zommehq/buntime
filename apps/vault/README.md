# Vault App Worker

Vault is a fullstack worker app for Buntime. It serves a React SPA and a Hono API for hierarchical configuration values, secrets, audit logs, and version history.

## Table of Contents

- [Concepts](#concepts)
  - [Overview](docs/concepts/overview.md)
  - [Architecture](docs/concepts/architecture.md)
- [API](#api)
  - [API Reference](docs/api-reference.md)
- [Security](#security)
  - [Authentication and Multi-Tenancy](docs/security.md)
- [Development](#development)
  - [Local Development](docs/deployment/local.md)
  - [Database](docs/deployment/database.md)
- [Operations](#operations)
  - [Tracing](docs/operations/tracing.md)
  - [Testing](docs/operations/testing.md)
  - [Troubleshooting](docs/operations/troubleshooting.md)
- [Deployment](#deployment)
  - [Edge Runtime Deployment](docs/deployment/edge-runtime.md)

## Concepts

### Overview

See [Overview](docs/concepts/overview.md) for the product scope, major capabilities, and runtime behavior.

### Architecture

See [Architecture](docs/concepts/architecture.md) for backend/frontend structure, route layout, and data flow.

## API

See [API Reference](docs/api-reference.md) for endpoint coverage, query/body schemas, and error behavior.

## Security

See [Authentication and Multi-Tenancy](docs/security.md) for token extraction, tenant resolution, and development fallback behavior.

## Development

### Quick Start

```bash
# From monorepo root
bun install

# Optional: copy env example for standalone/local scripts
cp apps/vault/server/.env.example apps/vault/server/.env

# Type check and test
bun run --filter @buntime/vault lint:types
bun run --filter @buntime/vault test
```

### Local Runtime Integration

Vault is discovered by Buntime from the `apps/` directory. In this repository, the root `.env` already points `RUNTIME_WORKER_DIRS` to include `apps`.

```bash
# From monorepo root
bun dev
```

Once running through Buntime:

- App base path: `/vault`
- Vault API base (relative to app): `/vault/api/vault`

### Build

```bash
bun run --filter @buntime/vault build
```

Build output:

- Worker bundle: `apps/vault/dist/index.js`
- SPA assets: `apps/vault/dist/client/*`
- Copied migrations: `apps/vault/dist/migrations/*`

## Operations

### Tracing

OpenTelemetry helpers are documented in [Tracing](docs/operations/tracing.md). Correlation headers (`x-worker-id`, `x-request-id`, `x-tenant-id`) are propagated by the runtime.

### Testing

Testing strategy and commands are documented in [Testing](docs/operations/testing.md).

### Troubleshooting

Operational diagnostics and common failure playbooks are documented in [Troubleshooting](docs/operations/troubleshooting.md).

## Deployment

See [Edge Runtime Deployment](docs/deployment/edge-runtime.md) for packaging/versioning, environment configuration, and production checks.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_MASTER_KEY` | Yes (for `SECRET` values) | Base64-encoded 32-byte key used by AES-256-GCM encryption. |
| `PGLITE_PATH` | No | Enables local embedded Postgres (PGlite). If set, it takes precedence over `DATABASE_URL`. |
| `DATABASE_URL` | Yes in production | PostgreSQL connection string when `PGLITE_PATH` is not set. |
| `DEBUG` | No | Enables additional debug logging paths when set to `true`. |

## License

See the root [LICENSE](../../LICENSE) file.
