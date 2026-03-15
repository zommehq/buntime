# Project Conventions

## Import Aliases

- `@/*` → `./server/*` — used for server-internal imports and by the client for Hono RPC type imports (`AppType`)
- `~/*` → `./client/*` — used for client-internal imports

Both are configured in the root `tsconfig.json`.

## File Naming

- Route-private folders prefixed with `-`: `-components/`, `-hooks/`, `-types.ts`
- Database schema and Zod validators co-located in route folders: `parameters.schema.ts`
- Enum files in `server/shared/enums/`

## Parameter Key Normalization (Client-Side)

Keys are normalized before submission:
- Lowercased
- Non-alphanumeric/underscore chars replaced with `_`
- Consecutive underscores collapsed
- Leading/trailing underscores stripped

## Error Handling

- Controllers catch errors by message string (`error.message === "ParameterNotFoundException"`)
- Services throw `new Error("ErrorName")` for domain errors
- Hono `HTTPException` for HTTP-level errors
- Generic 500 for unexpected errors

## OpenAPI Documentation

- Every route uses `describeRoute()` from `hono-openapi`
- Request body validated with `zValidator("json", schema)`
- Scalar UI available at `/docs`

## Tree Data Structure

Parameters are stored as flat rows in DB but returned as nested trees via `buildTree()`:
- `parentId === null` → root node
- `type === GROUP` → container with children, no value
- Other types → leaf nodes with values

## TanStack Query Conventions

- Hook files in `-hooks/` folder
- One hook per file: `use-parameters.ts`, `use-create-parameter.ts`, etc.
- Follow the `$` suffix pattern: `const params$ = useParameters()`
