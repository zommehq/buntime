import type { PGlite } from "@electric-sql/pglite";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import QuickLRU from "quick-lru";
import { parameterAuditLog } from "@/routes/vault/audit-log.schema.ts";
import { parameterVersion } from "@/routes/vault/parameter-version.schema.ts";
import {
  clientCategories,
  clients,
  clusterSpaceClients,
  clusterSpaceParameters,
  clusters,
  countries,
  regions,
  states,
} from "@/routes/vault/vault.schema.ts";
import { logger } from "@/utils/logger.ts";

const schema = {
  countries,
  states,
  regions,
  clusters,
  clientCategories,
  clients,
  clusterSpaceClients,
  clusterSpaceParameters,
  parameterAuditLog,
  parameterVersion,
};

type DrizzlePGlite = ReturnType<typeof import("drizzle-orm/pglite").drizzle<typeof schema>>;
type DrizzlePostgres = ReturnType<typeof drizzlePostgres<typeof schema>>;
type DrizzleInstance = DrizzlePGlite | DrizzlePostgres;

type GetDrizzleInstanceParams = {
  connectionString?: string;
  client?: InstanceType<typeof PGlite> | postgres.Sql<Record<string | number | symbol, never>>;
};

const cache = new QuickLRU<string, DrizzleInstance>({
  maxAge: 8000 * 60 * 60, // 8 hours
  maxSize: 500, // 500 connections
  onEviction: (_key, db) => {
    if (db.$client && "end" in db.$client && typeof db.$client.end === "function") {
      db.$client.end();
    }
  },
});

export const getDrizzleInstance = async ({
  connectionString,
  client,
}: GetDrizzleInstanceParams = {}): Promise<DrizzleInstance> => {
  const pglitePath = process.env.PGLITE_PATH;
  const usePglite = Boolean(pglitePath);

  if (usePglite) {
    const cacheKey = `pglite:${pglitePath}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }

    logger({ prefix: "drizzle" }).info(`Using PGlite with path: "${pglitePath}"`);

    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");

    const pgClient = new PGlite(pglitePath);
    await pgClient.waitReady;

    const db = drizzlePglite({ client: pgClient, schema });
    cache.set(cacheKey, db);
    return db;
  }

  const cacheKey = connectionString || process.env.DATABASE_URL || "";

  if (!cacheKey) {
    throw new Error("DATABASE_URL or connectionString is required");
  }

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  logger({ prefix: "drizzle" }).info(`Creating Postgres instance for: "${cacheKey}"`);

  const pgClient = client || postgres(cacheKey);
  const db = drizzlePostgres({ client: pgClient as postgres.Sql<{}>, schema });
  cache.set(cacheKey, db);

  return db;
};

export type Db = Awaited<ReturnType<typeof getDrizzleInstance>>;

export type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
