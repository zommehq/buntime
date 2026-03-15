import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { DATABASE_SCHEMA, PGLITE_PATH } from "./constants.ts";

if (!PGLITE_PATH) {
  console.error("❌ Migrations not applied: PGLITE_PATH is not defined");
  process.exit(1);
}

await migrate(drizzle({ client: new PGlite(PGLITE_PATH) }), {
  migrationsFolder: path.join(process.cwd(), "server/migrations"),
  migrationsSchema: DATABASE_SCHEMA,
});

console.log("✅ Migrations applied successfully.");
