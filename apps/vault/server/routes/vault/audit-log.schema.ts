import { bigint, index, pgSchema, timestamp, varchar } from "drizzle-orm/pg-core";
import { DATABASE_SCHEMA } from "@/constants.ts";
import { clusterSpaceParameters } from "./vault.schema.ts";

const dbSchema = pgSchema(DATABASE_SCHEMA);

export const parameterAuditLog = dbSchema.table(
  "parameter_audit_log",
  {
    auditLogId: bigint("audit_log_id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    clusterSpaceParameterId: bigint("cluster_space_parameter_id", { mode: "number" }).references(
      () => clusterSpaceParameters.clusterSpaceParameterId,
      { onDelete: "set null" },
    ),
    clusterSpaceClientId: bigint("cluster_space_client_id", { mode: "number" }).notNull(),
    parameterKey: varchar("parameter_key", { length: 256 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    actorEmail: varchar("actor_email", { length: 255 }),
    actorUsername: varchar("actor_username", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    oldValueHash: varchar("old_value_hash", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ix_audit_log_parameter").on(table.clusterSpaceParameterId),
    index("ix_audit_log_client").on(table.clusterSpaceClientId),
    index("ix_audit_log_created_at").on(table.createdAt),
  ],
);

export type AuditLogEntry = typeof parameterAuditLog.$inferSelect;
export type NewAuditLogEntry = typeof parameterAuditLog.$inferInsert;
