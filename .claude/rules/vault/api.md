# API

## Framework

- **Hono** with OpenAPI documentation via `hono-openapi`
- **Validation:** Zod schemas with `@hono/zod-validator`
- **API docs UI:** Scalar at `/docs`, OpenAPI spec at `/openapi.json`

## Base URLs

- Local: `http://localhost:8000/api`
- Edge deployment: `/a/parameters-api/api`

## Client API Configuration

The client uses Hono RPC (`hc`) with a hardcoded `/api` base path (no env vars needed). Configured in `client/helpers/api.ts`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/parameters` | List parameters. Query: `onlyRoots=true`, `path=a.b.c` |
| `GET` | `/api/parameters/:id/children` | Get children of a parameter as tree |
| `POST` | `/api/parameters` | Create parameter (supports nested `children` array) |
| `PUT` | `/api/parameters/:id` | Update parameter by ID |
| `DELETE` | `/api/parameters/:id` | Delete parameter by ID (204) |
| `GET` | `/health` | Health check |
| `GET` | `/openapi.json` | OpenAPI 3.1 spec |
| `GET` | `/docs` | Scalar API docs UI |
| `GET` | `/api/set-cookie` | Dev only — set auth cookie via `?token=<jwt>` |

## Request/Response Format

### Tree Response Shape

```json
[
  {
    "id": 1,
    "parentId": null,
    "children": [
      {
        "id": 2,
        "parentId": 1,
        "children": [],
        "description": "Some Parameter",
        "key": "some_key",
        "value": "some_value",
        "type": "STRING"
      }
    ],
    "description": "My Group",
    "key": "my_group",
    "value": null,
    "type": "GROUP"
  }
]
```

### Create/Update Body

```json
{
  "description": "Parameter description",
  "key": "parameter_key",
  "value": "parameter_value",
  "type": "STRING",
  "parentId": null,
  "children": []
}
```

## Error Codes

| Error | HTTP Status |
|---|---|
| `DuplicatedParameterException` | 400 |
| `ParameterNotFoundException` | 404 |
| `ParameterParentNotFoundException` | 404 |
| `Cluster space not found` | 404 |
| Missing/invalid token | 401 |

## Middleware Chain

1. CORS (dev only)
2. `setTenantDb` — Extracts JWT, resolves tenant, injects DB instance
3. `autoTracing` — OpenTelemetry automatic tracing
