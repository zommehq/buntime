# Troubleshooting

This guide lists common operational failures and fast checks for Vault in local and worker runtime modes.

## Quick Health Checks

When app name is `vault` in Buntime:

```bash
curl -i http://localhost:8000/vault/health
curl -i http://localhost:8000/vault/openapi.json
curl -i http://localhost:8000/vault/docs
```

For API checks:

```bash
curl -i http://localhost:8000/vault/api/vault
```

If these routes fail, verify app discovery (`RUNTIME_WORKER_DIRS`) and manifest entrypoint (`dist/index.js`).

## Auth Errors

### `401 Token is required`

Cause:

- No `Authorization` header and no `HYPER-AUTH-TOKEN` cookie.

Checks:

```bash
curl -i http://localhost:8000/vault/api/vault \
  -H "Authorization: Bearer <jwt>"
```

Local helper:

```bash
curl -i "http://localhost:8000/vault/api/set-cookie?token=<jwt>"
```

### `401 Invalid token or missing hyper_cluster_space`

Cause:

- JWT payload missing `hyper_cluster_space`.

Action:

- Ensure token payload includes `hyper_cluster_space` (tenant UUID).

### Works locally without token, but fails in production

Cause:

- Dev bypass only works when `NODE_ENV != production` and `PGLITE_PATH` is set.

Action:

- Provide valid token in non-dev environments.

## Vault Crypto Errors

### `503 Vault not configured`

Cause:

- Secret operation without `VAULT_MASTER_KEY`.

Affected endpoints:

- `GET /vault/api/vault/:id/reveal`
- `GET /vault/api/vault/resolve`
- `POST /vault/api/vault` for `SECRET`
- `PUT /vault/api/vault/:id` for `SECRET`

Check:

```bash
echo "$VAULT_MASTER_KEY" | wc -c
```

Expected:

- Base64 value for exactly 32 bytes key material.

Generate key:

```bash
openssl rand -base64 32
```

## Tenant / Data Resolution Errors

### `404 Cluster space not found`

Cause:

- `hyper_cluster_space` claim not mapped to any row in `parameters.cluster_space_client`.

Action:

- Validate tenant UUID in token.
- Ensure tenant exists in DB (or run local seeds).

Seed local dev data:

```bash
bun run --filter @buntime/vault db:seed
```

### `404 Parameter not found` or `404 Version not found`

Cause:

- Invalid `:id` / `:versionId` or resource removed.

Action:

- Confirm IDs via list endpoints before reveal/version/rollback calls.

## Database Connectivity Errors

### `DATABASE_URL or connectionString is required`

Cause:

- No usable DB source.

Connection resolution order:

1. PGlite (`PGLITE_PATH`) in local helper.
2. `x-database-url` header.
3. `DATABASE_URL`.

Action:

- Set `PGLITE_PATH` for local.
- Or set `DATABASE_URL`.
- In runtime, verify `x-database-url` injection path.

### Wrong DB/schema behavior

Cause:

- App tables are fixed under schema `parameters`.

Action:

- Confirm DB user has access to schema `parameters`.
- Confirm migrations were applied.

Apply local migrations:

```bash
PGLITE_PATH=./apps/vault/server/pg_data bun run --filter @buntime/vault server/migrate.ts
```

## Route and Asset Issues

### UI opens, but API calls fail

Cause:

- Base path mismatch or app not running under `/vault`.

Action:

- Keep `manifest.yaml` with `injectBase: true`.
- Keep client API base relative (`api`) to respect injected base.

### API works, but SPA route reload returns 404

Cause:

- Static output not built/copied in `dist/client` for worker entrypoint.

Action:

```bash
bun run --filter @buntime/vault build
```

Verify artifacts:

- `apps/vault/dist/index.js`
- `apps/vault/dist/client/index.html`
- `apps/vault/dist/migrations/*`

## Secret Lifecycle Confusion

### Secret value did not change after edit

Cause:

- In secret edit, empty `value` preserves current encrypted value by design.

Action:

- Provide a non-empty value when rotating/updating secret.

### Rollback behavior expectation mismatch

Behavior:

- Rollback restores target encrypted value and creates a new latest version.
- Audit logs a `rotated` action.

## Test Coverage Reality

Current automated tests include:

- `server/helpers/crypto.test.ts`
- `server/helpers/secret-resolver.test.ts`

Note:

- `server/routes/vault/vault.route.test.ts` currently exists but is empty.

