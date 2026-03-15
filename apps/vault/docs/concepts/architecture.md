# Architecture

Vault is implemented as a Buntime worker app with a bundled SPA and API.

## Project Structure

```text
apps/vault/
├── index.ts                       # Worker entry (routes + SPA fallback)
├── manifest.yaml                  # Worker manifest for runtime
├── client/
│   ├── index.tsx
│   ├── routeTree.gen.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx              # Redirects to /vault
│   │   └── vault/
│   │       ├── index.tsx
│   │       ├── audit-log.tsx
│   │       ├── -hooks/
│   │       └── -components/
│   └── helpers/api.ts             # Typed Hono client (relative base: "api")
├── server/
│   ├── index.ts                   # Hono app, OpenAPI, /api mount
│   ├── middleware/set-tenant-db.ts
│   ├── controllers/vault.controller.ts
│   ├── services/vault.service.ts
│   ├── repositories/
│   ├── routes/vault/
│   │   ├── vault.route.ts
│   │   ├── vault.schema.ts
│   │   ├── audit-log.schema.ts
│   │   └── parameter-version.schema.ts
│   ├── helpers/
│   │   ├── drizzle.ts
│   │   ├── crypto.ts
│   │   └── secret-resolver.ts
│   └── utils/tracing.ts
└── scripts/build.ts
```

## Backend Layers

- `routes`: HTTP contract and request validation.
- `controller`: HTTP orchestration and response mapping.
- `service`: business rules, encryption/decryption flow, versioning, and audit behavior.
- `repository`: persistence operations using Drizzle.

## Frontend Layers

- `routes/vault/*`: page-level route components.
- `-hooks/*`: query/mutation wrappers around the typed API client.
- `-components/*`: route-scoped UI components.
- Global shell components in `client/components/*`.

## Request Flow

```text
Browser
  -> /vault (SPA)
  -> /vault/api/vault/* (relative api client)
     -> server/index.ts (/api mount)
     -> routes/vault/vault.route.ts
     -> controller -> service -> repository
     -> database
```

The worker entrypoint also exposes:

- `/health`
- `/openapi.json`
- `/docs`
- `/api/set-cookie` (dev only helper)

Any non-API path is handled by static asset serving with SPA fallback (`index.html`) and a path traversal guard.

## Data Access and Tenant Resolution

- Middleware reads `x-database-url` when provided by runtime.
- Fallback to `DATABASE_URL` when header is absent.
- In local dev (`NODE_ENV != production`) + `PGLITE_PATH`, tokenless requests use a fixed dev tenant.

Token resolution order:

1. `Authorization` header (`Bearer`)
2. `HYPER-AUTH-TOKEN` cookie

## Secret Lifecycle

1. API receives secret payload.
2. `VaultService` encrypts value via `helpers/crypto.ts`.
3. Encrypted payload is persisted.
4. Reveal endpoint decrypts only when requested and authorized.
5. Audit and version records are written for secret-sensitive operations.

Additional lifecycle rules:

- Secret values in tree responses are always masked.
- Empty secret value on update preserves stored encrypted value.
- Rollback reuses selected encrypted value and creates a new version entry.
- Expiration status is derived as `active`, `expiring_soon` (<= 30 days), or `expired`.

## Frontend State and UX Behavior

- Main page keeps selected root group in query param `groupId`.
- If `groupId` is invalid, selection resets to first available group.
- Secret reveal in table, detail sheet, and versions auto-hides after 10 seconds.
- Secret detail includes inline `Activity` and `Versions` tabs.
- Detail sheet links to full global audit log page (`/vault/audit-log`).
