import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import type { PluginContext, PluginImpl, PluginLogger } from "@buntime/shared/types";

interface DatabaseService {
  getAdapter(type?: string, tenantId?: string): Promise<any>;
  getAvailableTypes(): string[];
  getDefaultType(): string;
  getRootAdapter(type?: string): any;
}

import { runMigrations } from "./lib/migrations";
import { runSeeds } from "./lib/seeds";
import type { AppDatabaseConfig, AppInfo } from "./lib/types";
import { APP_DATABASE_DEFAULTS } from "./lib/types";

let logger: PluginLogger;

interface DatabaseManifestInfo {
  config: AppDatabaseConfig;
  manifestDir: string;
  manifestPath: string;
}

/**
 * Migrations plugin for Buntime
 *
 * Discovers apps that declare a `database` section in their manifest.yaml
 * and runs migrations/seeds using the provider specified by each app.
 *
 * Apps without a `database` section are silently ignored.
 */
export default (): PluginImpl => {
  let dbService: DatabaseService | undefined;
  let resourceTenantPlugin: any;

  return {
    async onInit(ctx: PluginContext) {
      logger = ctx.logger;

      // Get optional services (loaded only if apps need them)
      dbService = ctx.getPlugin<DatabaseService>("@buntime/plugin-database");
      resourceTenantPlugin = ctx.getPlugin("@buntime/plugin-resource-tenant");

      // Discover apps with database config
      const workerDirs = ctx.globalConfig.workerDirs || ["/data/apps"];
      const apps = await discoverApps(workerDirs);

      if (apps.length === 0) {
        logger.info("No apps with database config found");
        return;
      }

      logger.info(`Found ${apps.length} app(s) with migrations to process`);

      // Run migrations for each app
      for (const app of apps) {
        await runAppMigrations(app);
      }

      logger.info("Migrations plugin initialized successfully");
    },
  };

  /**
   * Discover apps that have a `database` section in their manifest.yaml
   */
  async function discoverApps(workerDirs: string[]): Promise<AppInfo[]> {
    const apps: AppInfo[] = [];

    for (const baseDir of workerDirs) {
      if (!existsSync(baseDir)) {
        logger.debug(`Worker directory not found: ${baseDir}`);
        continue;
      }

      logger.debug(`Scanning directory: ${baseDir}`);
      const entries = readdirSync(baseDir);

      for (const appName of entries) {
        const appPath = join(baseDir, appName);

        if (!isDirectory(appPath)) {
          continue;
        }

        const discoveryDirs = new Set<string>([appPath]);
        for (const childDir of safeReaddir(appPath)) {
          const candidatePath = join(appPath, childDir);
          if (isDirectory(candidatePath)) {
            discoveryDirs.add(candidatePath);
          }
        }

        for (const candidatePath of discoveryDirs) {
          const manifest = await readDatabaseConfig(candidatePath, appName);
          if (!manifest) continue;

          const dbConfig = manifest.config;
          const migrationsPath = resolveManifestPath(manifest.manifestDir, dbConfig.migrations);

          if (!isDirectory(migrationsPath)) {
            logger.debug(
              `Migrations folder not found for ${appName} in ${manifest.manifestPath}: ${migrationsPath}`,
            );
            continue;
          }

          const seedsPath = dbConfig.seeds
            ? resolveManifestPath(manifest.manifestDir, dbConfig.seeds)
            : undefined;
          const appDisplayName =
            candidatePath === appPath ? appName : `${appName}/${basename(candidatePath)}`;

          apps.push({
            database: dbConfig,
            dir: manifest.manifestDir,
            migrationsPath,
            name: appDisplayName,
            seedsPath,
          });

          logger.debug(
            `Found app: ${appDisplayName} (provider: ${dbConfig.provider}, manifest: ${manifest.manifestPath})`,
          );
        }
      }
    }

    return apps;
  }

  /**
   * Read `database` section from app manifest.yaml
   * Returns null if no database section exists (app is silently ignored).
   */
  async function readDatabaseConfig(
    appDir: string,
    appName: string,
  ): Promise<DatabaseManifestInfo | null> {
    for (const filename of ["manifest.yaml", "manifest.yml"]) {
      const manifestPath = join(appDir, filename);
      if (!existsSync(manifestPath)) continue;

      try {
        const content = await Bun.file(manifestPath).text();
        const manifest = Bun.YAML.parse(content) as { database?: Partial<AppDatabaseConfig> };

        if (!manifest.database) return null;

        // Merge with defaults
        const config: AppDatabaseConfig = {
          ...APP_DATABASE_DEFAULTS,
          ...manifest.database,
        };

        logger.debug(`Found database config for ${appName}: provider=${config.provider}`);
        return {
          config,
          manifestDir: appDir,
          manifestPath,
        };
      } catch (error) {
        logger.warn(`Error reading manifest in ${appDir}: ${error}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Run migrations (and optionally seeds) for a specific app
   */
  async function runAppMigrations(app: AppInfo): Promise<void> {
    const { name, database } = app;

    try {
      logger.info(`Running migrations for ${name} (provider: ${database.provider})`);

      if (database.provider === "resource-tenant") {
        await runWithResourceTenant(app);
      } else {
        await runWithPluginDatabase(app);
      }

      logger.info(`Migrations for ${name} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to run migrations for ${name}: ${errorMessage}`);
    }
  }

  /**
   * Read DATABASE_URL from app's .env file
   */
  async function readAppDatabaseUrl(appDir: string): Promise<string | null> {
    const envPath = join(appDir, ".env");
    if (!existsSync(envPath)) return null;

    try {
      const content = await Bun.file(envPath).text();
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#") || !trimmed) continue;
        const [key, ...rest] = trimmed.split(/\s*=\s*/);
        if (key === "DATABASE_URL") {
          const val = rest.join("=").replace(/^['"]|['"]$/g, "");
          return val || null;
        }
      }
    } catch {
      // Ignore read errors
    }

    return null;
  }

  /**
   * Run migrations using resource-tenant provider.
   * Falls back to DATABASE_URL from app's .env if resource-tenant fails.
   */
  async function runWithResourceTenant(app: AppInfo): Promise<void> {
    const { name, migrationsPath, seedsPath, database } = app;

    let databaseUrl: string | null = null;

    // Try resource-tenant first
    if (resourceTenantPlugin && database.resourceTenant) {
      const tenantId = extractTenantIdFromEnv();
      if (tenantId) {
        databaseUrl = await resourceTenantPlugin.fetchDatabaseUrl(
          database.resourceTenant,
          tenantId,
        );
      }
    }

    // Fallback to DATABASE_URL from app's .env
    if (!databaseUrl) {
      databaseUrl = await readAppDatabaseUrl(app.dir);
      if (databaseUrl) {
        logger.info(`Using DATABASE_URL fallback from .env for ${name}`);
      }
    }

    if (!databaseUrl) {
      logger.error(
        `No database URL for ${name} (no resource-tenant response and no DATABASE_URL in .env)`,
      );
      return;
    }

    const adapterType = database.adapterType || "postgres";
    logger.debug(`Using database: ${databaseUrl.substring(0, 50)}... (schema: ${database.schema})`);

    // Run migrations
    await runMigrations(databaseUrl, migrationsPath, database.schema, adapterType, logger);

    // Run seeds if configured
    if (seedsPath && existsSync(seedsPath)) {
      logger.info(`Running seeds for ${name}`);
      const db = await createDirectConnection(databaseUrl, adapterType);
      try {
        await runSeeds(db, seedsPath, logger);
      } finally {
        await closeConnection(db);
      }
    }
  }

  /**
   * Run migrations using plugin-database provider
   */
  async function runWithPluginDatabase(app: AppInfo): Promise<void> {
    const { name, migrationsPath, seedsPath, database } = app;

    if (!dbService) {
      logger.error(`App ${name} requires plugin-database but it is not loaded, skipping`);
      return;
    }

    const tenantId = extractTenantIdFromEnv();
    const adapterType = database.adapterType || undefined;

    // Get adapter from plugin-database
    const adapter = tenantId
      ? await dbService.getAdapter(adapterType, tenantId)
      : dbService.getRootAdapter(adapterType);

    if (!adapter) {
      logger.error(`No database adapter for ${name} (type: ${adapterType}, tenant: ${tenantId})`);
      return;
    }

    // Extract connection URL/path from adapter
    const connectionUrl = getAdapterUrl(adapter, adapterType || dbService.getDefaultType());
    if (!connectionUrl) {
      logger.error(`Cannot extract connection URL from adapter for ${name}`);
      return;
    }

    const effectiveAdapterType = adapterType || dbService.getDefaultType();
    logger.debug(`Using adapter: ${effectiveAdapterType} (schema: ${database.schema})`);

    // Run migrations
    await runMigrations(
      connectionUrl,
      migrationsPath,
      database.schema,
      effectiveAdapterType,
      logger,
    );

    // Run seeds if configured
    if (seedsPath && existsSync(seedsPath)) {
      logger.info(`Running seeds for ${name}`);
      await runSeeds(adapter, seedsPath, logger);
    }
  }

  /**
   * Extract connection URL/path from a database adapter
   */
  function getAdapterUrl(adapter: any, adapterType: string): string | null {
    // Try common patterns for getting connection info
    if (typeof adapter.getUrl === "function") return adapter.getUrl();
    if (typeof adapter.url === "string") return adapter.url;
    if (typeof adapter.path === "string") return adapter.path;
    if (adapter.connectionString) return adapter.connectionString;

    // For raw client access
    if (typeof adapter.getRawClient === "function") {
      const client = adapter.getRawClient();
      if (typeof client === "string") return client;
      if (client?.url) return client.url;
      if (client?.path) return client.path;
    }

    logger.warn(`Could not extract URL from adapter (type: ${adapterType})`);
    return null;
  }

  /**
   * Create a direct database connection for seeds (resource-tenant provider)
   */
  async function createDirectConnection(databaseUrl: string, adapterType: string): Promise<any> {
    switch (adapterType) {
      case "postgres": {
        const { SQL } = await import("bun");
        return new SQL(databaseUrl);
      }
      case "sqlite": {
        const { Database } = await import("bun:sqlite");
        return new Database(normalizeSqlitePath(databaseUrl));
      }
      case "libsql": {
        const { createClient } = await import("@libsql/client/http");
        return createClient({ url: databaseUrl });
      }
      case "pglite": {
        const { PGlite } = await import("@electric-sql/pglite");
        return new PGlite(databaseUrl);
      }
      default:
        throw new Error(`Unsupported adapter type for direct connection: ${adapterType}`);
    }
  }

  /**
   * Close a direct database connection
   */
  async function closeConnection(connection: any): Promise<void> {
    try {
      await connection?.close?.();
    } catch {
      // Connection close errors are non-critical
    }
  }

  /**
   * Extract tenant ID from environment
   */
  function extractTenantIdFromEnv(): string | null {
    if (Bun.env.TENANT_ID) {
      logger.debug(`Using TENANT_ID: ${Bun.env.TENANT_ID}`);
      return Bun.env.TENANT_ID;
    }

    // Try to extract from hostname
    const hostname = Bun.env.HOSTNAME || "";
    const match = hostname.match(/^([^.]+)\./);
    if (match) {
      logger.debug(`Extracted tenant from hostname: ${match[1]}`);
      return match[1];
    }

    logger.warn(`Could not determine tenant ID from environment (HOSTNAME: ${hostname})`);
    return null;
  }

  /**
   * Safe readdir that returns empty array on error
   */
  function safeReaddir(dir: string): string[] {
    try {
      return readdirSync(dir);
    } catch {
      return [];
    }
  }

  function isDirectory(path: string): boolean {
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }

  function resolveManifestPath(manifestDir: string, configuredPath: string): string {
    const path = configuredPath.trim();
    if (isAbsolute(path)) {
      return path;
    }
    return join(manifestDir, path);
  }

  function normalizeSqlitePath(databaseUrl: string): string {
    if (databaseUrl.startsWith("sqlite://")) {
      return databaseUrl.slice("sqlite://".length);
    }
    if (databaseUrl.startsWith("file://")) {
      return databaseUrl.slice("file://".length);
    }
    if (databaseUrl.startsWith("file:")) {
      return databaseUrl.slice("file:".length);
    }
    return databaseUrl;
  }
};
