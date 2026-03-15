import type { PGlite } from "@electric-sql/pglite";
import { DEV_TENANT_UUID } from "../constants.ts";

export default async (db: PGlite) => {
  console.log("Seeding dev tenant...");

  // Auto-increment sequence for cluster_space_parameter PK.
  // Production DB manages IDs externally; PGlite needs a sequence
  // so INSERTs without an explicit ID work.
  await db.query(`
    CREATE SEQUENCE IF NOT EXISTS "parameters"."cluster_space_parameter_id_seq"
  `);
  await db.query(`
    ALTER TABLE "parameters"."cluster_space_parameter"
      ALTER COLUMN "cluster_space_parameter_id"
      SET DEFAULT nextval('"parameters"."cluster_space_parameter_id_seq"')
  `);

  // Insert mock tenant (ON CONFLICT DO NOTHING for idempotency)
  await db.query(
    `
    INSERT INTO "parameters"."cluster_space_client" (
      cluster_space_client_id,
      cluster_space_uuid,
      main_url_dns,
      type_url_login,
      url_login,
      status,
      timezone,
      default_language,
      default_formatdate,
      default_formattime,
      default_formatdatetime,
      default_formatmoney,
      messaging_engine,
      queue_data_exchange,
      realm,
      monitor_ingowner,
      alias
    ) VALUES (
      1, $1, 'localhost', 'I', 'http://localhost:8000', 'A',
      'UTC', 'en', 'yyyy-MM-dd', 'HH:mm:ss',
      'yyyy-MM-dd HH:mm:ss', '#,##0.00', 'NONE',
      'dev-exchange', 'dev-realm', 'N', 'dev-local'
    )
    ON CONFLICT (cluster_space_client_id) DO NOTHING
    `,
    [DEV_TENANT_UUID],
  );

  console.log(`Dev tenant seeded (UUID: ${DEV_TENANT_UUID}).`);
};
