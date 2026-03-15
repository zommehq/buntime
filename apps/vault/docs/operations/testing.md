# Testing

Vault uses Bun's native test runner (`bun:test`).

## Test Scope

Current automated tests focus on:

- Secret crypto helpers (`server/helpers/crypto.test.ts`).
- Secret reference resolver (`server/helpers/secret-resolver.test.ts`).

Current gaps:

- `server/routes/vault/vault.route.test.ts` exists but is currently empty.
- There is no automated coverage yet for controller/service route integration.

## Run Tests

From monorepo root:

```bash
bun run --filter @buntime/vault test
```

## Type Checking and Lint

```bash
bun run --filter @buntime/vault lint:types
bun run --filter @buntime/vault lint
```

## Recommended Workflow

1. Make backend/frontend changes.
2. Run `lint:types`.
3. Run `test`.
4. Run full `lint` before finalizing.

## Test Notes

- Crypto tests require explicit handling of `VAULT_MASTER_KEY` setup/cleanup.
- Route tests should prefer isolated database contexts and deterministic fixtures.
- Keep integration tests close to route files (`*.test.ts`) for discoverability.

## Recommended Next Coverage

1. Route integration tests for create/update/delete/reveal.
2. Audit log route tests (global and per-parameter).
3. Versioning tests (`/versions`, rollback).
4. Secret resolution and expiring secrets endpoint tests.
