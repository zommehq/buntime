/**
 * Database configuration from app manifest.
 *
 * Each app declares how it connects to a database in its manifest.yaml:
 *
 * ```yaml
 * database:
 *   provider: resource-tenant
 *   schema: parameters
 *   resourceTenant: parameters
 *   adapterType: postgres
 *   migrations: server/migrations
 *   seeds: server/seeds
 * ```
 */
export interface AppDatabaseConfig {
  adapterType?: string;
  migrations: string;
  provider: "plugin-database" | "resource-tenant";
  resourceTenant?: string;
  schema: string;
  seeds?: string;
}

/**
 * Defaults for AppDatabaseConfig
 */
export const APP_DATABASE_DEFAULTS: Pick<AppDatabaseConfig, "migrations" | "provider" | "schema"> =
  {
    migrations: "migrations",
    provider: "plugin-database",
    schema: "public",
  };

/**
 * Discovered app info (used internally)
 */
export interface AppInfo {
  database: AppDatabaseConfig;
  dir: string;
  migrationsPath: string;
  name: string;
  seedsPath?: string;
}
