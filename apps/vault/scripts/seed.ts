#!/usr/bin/env bun

/**
 * Seed runner for local development with PGlite.
 *
 * 1. Runs Drizzle migrations to ensure the schema exists
 * 2. Discovers and executes seed files from server/seeds/ in alphabetical order
 *
 * Follows the same pattern as plugins/plugin-migrations:
 * each seed file exports a default async function receiving the db instance.
 *
 * Usage:
 *   bun run db:seed
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { DATABASE_SCHEMA, PGLITE_PATH } from "../server/constants.ts";

if (!PGLITE_PATH) {
  console.error("PGLITE_PATH is not defined. Set it via env or use `bun run db:seed`.");
  process.exit(1);
}

const client = new PGlite(PGLITE_PATH);
await client.waitReady;

// 1. Run migrations
console.log("Running migrations...");
await migrate(drizzle({ client }), {
  migrationsFolder: path.join(process.cwd(), "server/migrations"),
  migrationsSchema: DATABASE_SCHEMA,
});
console.log("Migrations applied.");

// 2. Discover and run seeds from server/seeds/
const seedsDir = path.join(process.cwd(), "server/seeds");
const seedFiles = readdirSync(seedsDir)
  .filter((f) => /\.(ts|js|mts|mjs)$/.test(f))
  .sort();

for (const file of seedFiles) {
  const seedPath = path.join(seedsDir, file);
  try {
    const mod = await import(seedPath);
    const seedFn = mod.default || mod;
    if (typeof seedFn === "function") {
      await seedFn(client);
    }
  } catch (err) {
    console.error(`Error running seed ${file}:`, err);
  }
}

console.log("Done.");
await client.close();
