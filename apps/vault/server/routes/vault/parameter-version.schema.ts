import { bigint, index, integer, pgSchema, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { DATABASE_SCHEMA } from "@/constants.ts";
import { clusterSpaceParameters } from "./vault.schema.ts";

const dbSchema = pgSchema(DATABASE_SCHEMA);

export const parameterVersion = dbSchema.table(
  "parameter_version",
  {
    versionId: bigint("version_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    clusterSpaceParameterId: bigint("cluster_space_parameter_id", { mode: "number" })
      .notNull()
      .references(() => clusterSpaceParameters.clusterSpaceParameterId, { onDelete: "cascade" }),
    encryptedValue: text("encrypted_value").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 255 }),
  },
  (table) => [
    index("ix_parameter_version_parameter").on(table.clusterSpaceParameterId, table.version),
  ],
);

export type ParameterVersionEntry = typeof parameterVersion.$inferSelect;
export type NewParameterVersion = typeof parameterVersion.$inferInsert;
