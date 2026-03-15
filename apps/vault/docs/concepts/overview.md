# Overview

Vault is a fullstack worker app running inside Buntime. It combines:

- A React SPA for managing groups, parameters, and secrets.
- A Hono API for CRUD, audit log, secret reveal, versioning, rollback, and secret reference resolution.

## Core Capabilities

- Hierarchical tree of groups and parameters.
- `SECRET` parameter support with AES-256-GCM encryption.
- Audit log for secret-sensitive actions.
- Secret version history and rollback.
- Expiration metadata and expiring-secret queries.
- Relative API client (`api`) so the app works correctly under `/vault` with base injection.

## Runtime Paths

When served by Buntime as the `vault` app:

- UI: `/vault`
- API root inside app: `/vault/api`
- Vault API endpoints: `/vault/api/vault/*`

Example endpoints:

- `GET /vault/api/vault`
- `POST /vault/api/vault`
- `GET /vault/api/vault/:id/children`
- `GET /vault/api/vault/:id/reveal`
- `GET /vault/api/vault/audit-log`
- `GET /vault/api/vault/:id/audit-log`
- `GET /vault/api/vault/secrets/expiring`
- `GET /vault/api/vault/resolve`
- `GET /vault/api/vault/:id/versions`
- `POST /vault/api/vault/:id/rollback/:versionId`

## Tech Stack

- Runtime/build: Bun
- API: Hono + hono-openapi
- ORM: Drizzle ORM
- DB drivers: Postgres (`postgres`) and local PGlite
- Frontend: React + TanStack Router + TanStack Query + Tailwind
- Telemetry: OpenTelemetry API

## Security Model

- Secrets are encrypted before persistence.
- Secret plaintext is never stored in audit entries (`old_value_hash` is hashed).
- Tenant and actor context come from request headers/token middleware.
- In local dev with `PGLITE_PATH`, a dev-tenant fallback is enabled when no token is present.

See full endpoint and auth details in [API Reference](../api-reference.md) and [Authentication and Multi-Tenancy](../security.md).
