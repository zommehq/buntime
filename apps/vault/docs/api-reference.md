# API Reference

Vault API is mounted under `/api/vault` in standalone mode and `/vault/api/vault` when served by Buntime as app `vault`.

## Base Paths

- Worker mode (Buntime): `/vault/api/vault`
- Standalone local server: `/api/vault`

OpenAPI and docs endpoints:

- `/openapi.json` (`/vault/openapi.json` in worker mode)
- `/docs` (`/vault/docs` in worker mode)

## Endpoints

### Parameters

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List parameters as tree. Supports `onlyRoots` and `path`. |
| `GET` | `/:id/children` | List tree children for a parent parameter id. |
| `POST` | `/` | Create parameter or subtree (`children[]`). |
| `PUT` | `/:id` | Update parameter. |
| `DELETE` | `/:id` | Delete parameter. |

### Secret Operations

| Method | Path | Description |
|---|---|---|
| `GET` | `/:id/reveal` | Decrypt and return plaintext for a `SECRET`. |
| `GET` | `/secrets/expiring` | List `SECRET` parameters expiring within `days` query window. |
| `GET` | `/resolve` | Resolve `${secret:path.to.key}` references in non-secret leaf values. |

### Audit and Versioning

| Method | Path | Description |
|---|---|---|
| `GET` | `/audit-log` | Global tenant audit log for secret actions. |
| `GET` | `/:id/audit-log` | Audit log for a specific parameter id. |
| `GET` | `/:id/versions` | Version history for a `SECRET` parameter. |
| `POST` | `/:id/rollback/:versionId` | Rollback to a previous secret version (creates a new version entry). |

### Utility

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check (outside `/api/vault`, mounted at app root). |
| `GET` | `/api/set-cookie` | Dev-only helper to set `HYPER-AUTH-TOKEN` cookie from `?token=...`. |

## Query Parameters

### `GET /`

- `onlyRoots` (`boolean`, default `false`): return only root groups.
- `path` (`string`): dot-separated path filter (for subtree selection).

### `GET /audit-log`

- `limit` (`integer`, default `25`)
- `offset` (`integer`, default `0`)
- `action` (`created|updated|deleted|revealed|rotated`)
- `actorEmail` (`string`, partial match)
- `parameterKey` (`string`, partial match)

### `GET /:id/audit-log`

- `limit` (`integer`, default `20`)
- `offset` (`integer`, default `0`)

### `GET /:id/versions`

- `limit` (`integer`, default `20`)
- `offset` (`integer`, default `0`)

### `GET /secrets/expiring`

- `days` (`integer`, default `30`)

### `GET /resolve`

- `path` (`string`, optional subtree filter)

## Payload Notes

Create/update payload fields:

- `description` (`string`, required)
- `key` (`string`, required, normalized client-side)
- `type` (`GROUP|STRING|NUMBER|BOOLEAN|JSON|CODE|SECRET`, required)
- `value` (`string|null`, depending on type)
- `parentId` (`number|null`)
- `children` (`array`, create only)
- `expiresAt` (`ISO datetime|null`, `SECRET` only)
- `rotationIntervalDays` (`integer|null`, `SECRET` only)

Secret-specific behavior:

- Response tree always masks secret values (`••••••••`).
- In `PUT /:id`, if `type=SECRET` and `value` is empty/null, current encrypted value is preserved.
- `SECRET -> non-SECRET` update decrypts existing value and stores plaintext.

## Error Behavior

Common statuses by route:

- `400`: invalid id, invalid parent relation, duplicated key, invalid secret operation.
- `401`: missing token or token without `hyper_cluster_space`.
- `404`: parameter/path/version/cluster space not found.
- `503`: vault crypto not configured (`VAULT_MASTER_KEY`) for secret operations.
- `500`: unexpected internal error.

Common messages:

- `Token is required`
- `Invalid token or missing hyper_cluster_space`
- `Cluster space not found`
- `Parameter not found`
- `Parameter is not a secret`
- `Vault not configured`

## Reference Resolution Rules

`GET /resolve` uses `${secret:path.to.key}` tokens:

- Resolves only in non-secret, non-group leaf values.
- Secret nodes remain masked.
- Unresolvable references are kept as-is.
- Nested references are resolved recursively up to depth `5`.

