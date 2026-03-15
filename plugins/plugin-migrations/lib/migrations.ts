import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import type { PluginLogger } from "@buntime/shared/types";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@libsql/client/http";
import { SQL } from "bun";
import { drizzle as bunSqlDrizzle } from "drizzle-orm/bun-sql";
import { migrate as bunSqlMigrate } from "drizzle-orm/bun-sql/migrator";
import { drizzle as sqliteDrizzle } from "drizzle-orm/bun-sqlite";
import { migrate as sqliteMigrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle as libsqlDrizzle } from "drizzle-orm/libsql/http";
import { migrate as libsqlMigrate } from "drizzle-orm/libsql/migrator";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite";
import { migrate as pgliteMigrate } from "drizzle-orm/pglite/migrator";

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

/**
 * Run migration files using Drizzle ORM
 */
export async function runMigrations(
  databaseUrl: string,
  migrationsFolder: string,
  migrationsSchema: string,
  adapterType: string,
  log: PluginLogger,
): Promise<void> {
  if (!existsSync(migrationsFolder)) {
    log.warn(`Migrations folder not found: ${migrationsFolder}`);
    return;
  }

  try {
    log.info(`Running migrations from: ${migrationsFolder}`);

    // Create database connection and run migrations based on adapter type
    let connection: any;

    switch (adapterType) {
      case "postgres": {
        connection = new SQL(databaseUrl);
        const db = bunSqlDrizzle({ client: connection });

        await bunSqlMigrate(db, {
          migrationsFolder,
          migrationsSchema: migrationsSchema === "public" ? undefined : migrationsSchema,
        });
        break;
      }
      case "sqlite": {
        connection = new Database(normalizeSqlitePath(databaseUrl));
        const db = sqliteDrizzle(connection);

        await sqliteMigrate(db, {
          migrationsFolder,
          migrationsSchema: migrationsSchema === "public" ? undefined : migrationsSchema,
        });
        break;
      }
      case "libsql": {
        connection = createClient({ url: databaseUrl });
        const db = libsqlDrizzle({ client: connection });

        await libsqlMigrate(db, {
          migrationsFolder,
          migrationsSchema: migrationsSchema === "public" ? undefined : migrationsSchema,
        });
        break;
      }
      case "pglite": {
        connection = new PGlite(databaseUrl);
        const db = pgliteDrizzle({ client: connection });

        await pgliteMigrate(db, {
          migrationsFolder,
          migrationsSchema: migrationsSchema === "public" ? undefined : migrationsSchema,
        });
        break;
      }
      default:
        throw new Error(`Unsupported adapter type: ${adapterType}`);
    }

    log.info("Migrations completed successfully");

    // Close connection
    await connection?.close?.();
  } catch (err) {
    log.error("Error running migrations:", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}
