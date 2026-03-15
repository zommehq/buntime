import { describe, expect, it, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginLogger } from "@buntime/shared/types";
import { PgliteAdapter } from "./pglite";

function createMockLogger(): PluginLogger {
  return {
    debug: mock(() => {}),
    error: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
  };
}

describe("PgliteAdapter", () => {
  it("should execute queries on root adapter", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pglite-adapter-root-"));
    const adapter = new PgliteAdapter({
      baseDir,
      logger: createMockLogger(),
      type: "pglite",
    });

    try {
      await adapter.execute(
        "CREATE TABLE IF NOT EXISTS pglite_root_test (id SERIAL PRIMARY KEY, name TEXT NOT NULL)",
      );
      await adapter.execute("INSERT INTO pglite_root_test (name) VALUES ($1)", ["root"]);
      const rows = await adapter.execute<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM pglite_root_test",
      );

      expect(rows[0]?.total).toBe(1);
      expect(typeof adapter.getUrl).toBe("function");
      expect(adapter.getUrl()).toContain(baseDir);
    } finally {
      await adapter.close();
      rmSync(baseDir, { force: true, recursive: true });
    }
  });

  it("should isolate tenant data and manage tenant lifecycle", async () => {
    const baseDir = mkdtempSync(join(tmpdir(), "pglite-adapter-tenant-"));
    const rootAdapter = new PgliteAdapter({
      baseDir,
      logger: createMockLogger(),
      type: "pglite",
    });

    let tenantA: PgliteAdapter | null = null;
    let tenantB: PgliteAdapter | null = null;

    try {
      await rootAdapter.createTenant("tenant-a");
      await rootAdapter.createTenant("tenant-b");

      const tenants = await rootAdapter.listTenants();
      expect(tenants).toContain("tenant-a");
      expect(tenants).toContain("tenant-b");

      tenantA = (await rootAdapter.getTenant("tenant-a")) as PgliteAdapter;
      tenantB = (await rootAdapter.getTenant("tenant-b")) as PgliteAdapter;

      await tenantA.execute(
        "CREATE TABLE IF NOT EXISTS pglite_tenant_test (id SERIAL PRIMARY KEY, value TEXT NOT NULL)",
      );
      await tenantB.execute(
        "CREATE TABLE IF NOT EXISTS pglite_tenant_test (id SERIAL PRIMARY KEY, value TEXT NOT NULL)",
      );

      await tenantA.execute("INSERT INTO pglite_tenant_test (value) VALUES ($1)", ["A"]);
      await tenantB.execute("INSERT INTO pglite_tenant_test (value) VALUES ($1)", ["B"]);

      const tenantARows = await tenantA.execute<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM pglite_tenant_test",
      );
      const tenantBRows = await tenantB.execute<{ total: number }>(
        "SELECT COUNT(*)::int AS total FROM pglite_tenant_test",
      );

      expect(tenantARows[0]?.total).toBe(1);
      expect(tenantBRows[0]?.total).toBe(1);

      await tenantB.close();
      tenantB = null;
      await rootAdapter.deleteTenant("tenant-b");
      const tenantsAfterDelete = await rootAdapter.listTenants();
      expect(tenantsAfterDelete).toContain("tenant-a");
      expect(tenantsAfterDelete).not.toContain("tenant-b");
    } finally {
      await tenantA?.close();
      await tenantB?.close();
      await rootAdapter.close();
      rmSync(baseDir, { force: true, recursive: true });
    }
  });
});
