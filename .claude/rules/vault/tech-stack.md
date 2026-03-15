# Tech Stack

## Server

| Technology | Purpose | Version |
|---|---|---|
| Bun | Runtime and package manager | latest |
| Hono | HTTP framework | ^4.8.3 |
| Drizzle ORM | Database ORM | ^0.38.3 |
| drizzle-kit | Migration tool | ^0.31.0 |
| postgres (postgresjs) | PostgreSQL driver | ^3.4.5 |
| PGlite | Embedded PG for local dev | ^0.3.14 |
| Zod | Schema validation | ^4.1.12 |
| hono-openapi | OpenAPI spec generation | ^1.1.1 |
| @scalar/hono-api-reference | API docs UI | ^0.9.24 |
| @hono/zod-validator | Zod integration for Hono | ^0.6.0 |
| quick-lru | LRU cache for DB connections | ^7.0.0 |
| OpenTelemetry | Distributed tracing | ^1.9.0 |

## Client

| Technology | Purpose | Version |
|---|---|---|
| React | UI framework | ^19.2.0 |
| Vite | Build tool (client SPA only) | ^5.4.21 |
| TanStack Router | File-based routing | ^1.132.0 |
| TanStack Query | Server state management | ^5.66.5 |
| Tailwind CSS v4 | Styling | ^4.0.6 |
| Radix UI | Headless UI primitives | Various |
| Hono RPC (`hc`) | Type-safe API client | ^4.8.3 |
| lucide-react | Icons | ^0.544.0 |
| unplugin-icons | Icon imports as components | ^22.5.0 |
| class-variance-authority | Component variants | ^0.7.1 |

## Dev Tools

| Tool | Purpose |
|---|---|
| Biome | Linter + formatter (replaces ESLint + Prettier) |
| TypeScript | Type checking (^5.9.3) |
| drizzle-kit | DB migration generation and execution |
| concurrently | Run API + UI dev servers in parallel |

## Scripts

```bash
bun run dev           # Start API (--watch) + UI (vite build --watch) concurrently
bun run dev:api       # Start API server with hot reload (port 8000)
bun run dev:ui        # Vite build --watch with sourcemaps
bun run build         # Production build (server + client)
bun run lint          # Run lint:format + lint:types
bun run lint:format   # Biome check --write
bun run lint:types    # TypeScript type checking (tsc --noEmit)
bun run test          # Run tests with Bun test runner
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Run pending migrations
bun run db:check      # Check migration status
bun run db:seed       # Run migrations + seeds on PGlite (dev only)
```
