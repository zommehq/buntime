# Architecture

## Project Structure

Single package (no workspaces). Bun.serve entry point at root, Hono API in `server/`, React SPA in `client/`.

```
parameters/
├── index.ts             # Bun.serve entry point (routes API + serves SPA)
├── vite.config.ts       # Vite config (builds client SPA)
├── drizzle.config.ts    # Drizzle-kit config
├── tsconfig.json        # Unified TS config
├── package.json         # Single package (no workspaces)
├── biome.json           # Linter/formatter (Biome)
├── manifest.yaml        # Edge deployment manifest
├── scripts/
│   ├── build.ts         # Production build script
│   └── seed.ts          # Dev seed runner (migrations + seeds)
├── client/              # React SPA
├── server/              # Hono API server
├── plans/               # Implementation plans (gitignored)
└── dist/                # Build output (gitignored)
```

## Server Architecture

Layered architecture: **Route → Controller → Service → Repository → Database**

```
server/
├── index.ts                          # Hono app (export default), middleware, routing
├── constants.ts                      # App-wide constants (DB_URL, schema name)
├── controllers/
│   └── parameters.controller.ts      # HTTP layer — extracts context, calls service
├── services/
│   └── parameters.service.ts         # Business logic — tree building, validation
├── repositories/
│   ├── parameters.repository.ts      # Drizzle queries for parameters
│   └── cluster-space-client.repository.ts  # Tenant lookup
├── routes/
│   └── parameters/
│       ├── parameters.route.ts       # Hono route definitions + OpenAPI docs
│       └── parameters.schema.ts      # Drizzle DB schema + Zod validators
├── middleware/
│   └── set-tenant-db.ts              # Auth + DB injection middleware
├── helpers/
│   ├── drizzle.ts                    # Drizzle instance factory with LRU cache
│   ├── get-token.ts                  # Token extraction from header/cookie
│   └── jwt.ts                        # JWT decode (no signature verification)
├── shared/
│   └── enums/
│       └── parameters-enum.ts        # ParameterType enum + conversion helpers
├── utils/
│   ├── tracing.ts                    # OpenTelemetry tracing
│   ├── logger.ts                     # Logger utility
│   └── database.ts                   # Database URL parser
├── migrations/                       # Drizzle-kit SQL migrations
├── seeds/                            # Dev seed files (plugin-migrations pattern)
│   └── 01-dev-tenant.ts              # Mock tenant for local dev
├── migrate.ts                        # Migration runner
└── worker.config.json                # Edge worker config
```

## Client Architecture

React SPA with file-based routing (TanStack Router).

```
client/
├── index.html               # SPA HTML entry
├── index.tsx                 # React app bootstrap
├── index.css                 # Global styles (Tailwind)
├── helpers/
│   └── api.ts                # Hono RPC type-safe client
├── components/
│   └── ui/                   # Shared UI components (Radix-based)
├── routes/
│   └── parameters/
│       ├── index.tsx          # Main parameters page
│       ├── -types.ts          # Client-side types (Parameter, ParamType)
│       ├── -components/
│       │   ├── add-button.tsx
│       │   ├── group-select.tsx
│       │   ├── param-form.tsx
│       │   └── tree-table.tsx
│       └── -hooks/
│           ├── use-parameters.ts
│           ├── use-groups.ts
│           ├── use-create-parameter.ts
│           ├── use-update-parameter.ts
│           └── use-delete-parameter.ts
├── utils/                    # Client utility functions
└── routeTree.gen.ts          # Auto-generated route tree
```

## Key Patterns

- **Entry point:** `index.ts` uses `Bun.serve()` with route-based dispatch — API routes go to Hono, everything else serves the SPA from `dist/client/`.
- **Controller instantiation:** Controller creates repositories and services per-request using the DB instance from Hono context. This is because each tenant may have a different DB connection.
- **Tree building:** Flat DB rows are transformed into nested tree structures in the service layer via `buildTree()`.
- **Type-safe client:** The client uses Hono RPC (`hc`) for end-to-end type safety between server routes and client API calls.
- **DB connection caching:** `QuickLRU` cache with max 500 entries, 8-hour TTL, auto-eviction with connection cleanup.
