import { afterEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginContext } from "@buntime/shared/types";
import createPlugin from "./plugin";

describe("plugin-migrations", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { force: true, recursive: true });
    }
    tempDirs.length = 0;
  });

  const createTempDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), "plugin-migrations-test-"));
    tempDirs.push(dir);
    return dir;
  };

  const createApp = ({
    baseDir,
    manifestDir,
    migrationsDir,
    manifestContent,
  }: {
    baseDir: string;
    manifestContent: string;
    manifestDir: string;
    migrationsDir: string;
  }) => {
    const fullManifestDir = join(baseDir, manifestDir);
    const fullMigrationsDir = join(baseDir, migrationsDir);

    mkdirSync(fullManifestDir, { recursive: true });
    mkdirSync(fullMigrationsDir, { recursive: true });
    writeFileSync(join(fullManifestDir, "manifest.yaml"), manifestContent);
  };

  const createMockContext = (overrides = {}): PluginContext =>
    ({
      config: {},
      globalConfig: { workerDirs: [], poolSize: 10 },
      logger: {
        debug: mock(),
        info: mock(),
        warn: mock(),
        error: mock(),
      },
      runtime: { api: "/api", version: "0.0.0" },
      getPlugin: mock(() => undefined),
      registerService: mock(),
      getService: mock(() => undefined),
      ...overrides,
    }) as PluginContext;

  it("should create plugin instance", () => {
    const plugin = createPlugin();
    expect(plugin).toBeDefined();
    expect(plugin.onInit).toBeDefined();
  });

  it("should log info when no apps with database config found", async () => {
    const context = createMockContext();
    const plugin = createPlugin();

    await plugin.onInit?.(context);

    expect(context.logger.info).toHaveBeenCalledWith("No apps with database config found");
  });

  it("should not require database or resource-tenant plugins at init", async () => {
    const context = createMockContext();
    const plugin = createPlugin();

    await plugin.onInit?.(context);

    // Should NOT log any errors about missing plugins (they're optional)
    expect(context.logger.error).not.toHaveBeenCalled();
  });

  it("should discover root app and honor migrations path from manifest", async () => {
    const workerDir = createTempDir();
    createApp({
      baseDir: workerDir,
      manifestContent: `
database:
  provider: plugin-database
  adapterType: sqlite
  migrations: server/migrations
`,
      manifestDir: "vault",
      migrationsDir: "vault/server/migrations",
    });

    const context = createMockContext({
      globalConfig: { workerDirs: [workerDir], poolSize: 10 },
    });
    const plugin = createPlugin();

    await plugin.onInit?.(context);

    expect(context.logger.info).toHaveBeenCalledWith("Found 1 app(s) with migrations to process");
    expect(context.logger.info).toHaveBeenCalledWith(
      "Running migrations for vault (provider: plugin-database)",
    );
    expect(context.logger.error).toHaveBeenCalledWith(
      "App vault requires plugin-database but it is not loaded, skipping",
    );
  });

  it("should discover versioned app structure", async () => {
    const workerDir = createTempDir();
    createApp({
      baseDir: workerDir,
      manifestContent: `
database:
  provider: plugin-database
  adapterType: sqlite
  migrations: migrations
`,
      manifestDir: "legacy/v1",
      migrationsDir: "legacy/v1/migrations",
    });

    const context = createMockContext({
      globalConfig: { workerDirs: [workerDir], poolSize: 10 },
    });
    const plugin = createPlugin();

    await plugin.onInit?.(context);

    expect(context.logger.info).toHaveBeenCalledWith("Found 1 app(s) with migrations to process");
    expect(context.logger.info).toHaveBeenCalledWith(
      "Running migrations for legacy/v1 (provider: plugin-database)",
    );
    expect(context.logger.error).toHaveBeenCalledWith(
      "App legacy/v1 requires plugin-database but it is not loaded, skipping",
    );
  });
});
