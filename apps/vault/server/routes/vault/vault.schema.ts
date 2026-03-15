import {
  bigint,
  char,
  foreignKey,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { DATABASE_SCHEMA } from "@/constants.ts";

const dbSchema = pgSchema(DATABASE_SCHEMA);

export const countries = dbSchema.table("country", {
  countryId: bigint("country_id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
});

export const states = dbSchema.table(
  "state",
  {
    stateId: bigint("state_id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    countryId: bigint("country_id", { mode: "number" }),
  },
  (table) => ({
    fkStateCountry: foreignKey({
      columns: [table.countryId],
      foreignColumns: [countries.countryId],
      name: "fk_state_country",
    }),
    uqStateCountry: unique("uq_state_country").on(table.countryId, table.name),
  }),
);

export const regions = dbSchema.table(
  "region",
  {
    regionId: bigint("region_id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    status: char("status", { length: 1 }).notNull().default("A"),
    stateId: bigint("state_id", { mode: "number" }),
  },
  (table) => ({
    fkRegionState: foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_region_state",
    }),
    ixRegionState: index("ix_region_state").on(table.stateId),
  }),
);

export const clusters = dbSchema.table(
  "cluster",
  {
    clusterId: bigint("cluster_id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    notes: text("notes"),
    status: char("status", { length: 1 }).notNull().default("A"),
    regionId: bigint("region_id", { mode: "number" }),
  },
  (table) => ({
    fkClusterRegion: foreignKey({
      columns: [table.regionId],
      foreignColumns: [regions.regionId],
      name: "fk_cluster_region",
    }),
    ixClusterRegion: index("ix_cluster_region").on(table.regionId),
  }),
);

export const clientCategories = dbSchema.table("client_category", {
  clientCategoryId: bigint("client_category_id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  status: char("status", { length: 1 }).notNull().default("A"),
});

export const clients = dbSchema.table(
  "client",
  {
    clientId: bigint("client_id", { mode: "number" }).primaryKey(),
    clientUuid: varchar("client_uuid", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull().unique(),
    taxid: varchar("taxid", { length: 50 }).notNull(),
    notes: text("notes"),
    status: char("status", { length: 1 }).notNull().default("A"),
    clientCategoryId: bigint("client_category_id", { mode: "number" }).notNull(),
    address: varchar("address", { length: 150 }).notNull(),
    complement: varchar("complement", { length: 100 }),
    zipcode: varchar("zipcode", { length: 20 }),
    city: varchar("city", { length: 80 }).notNull(),
    stateprovince: varchar("stateprovince", { length: 50 }).notNull(),
    stateId: bigint("state_id", { mode: "number" }).notNull(),
  },
  (table) => ({
    fkClientClientcategory: foreignKey({
      columns: [table.clientCategoryId],
      foreignColumns: [clientCategories.clientCategoryId],
      name: "fk_client_clientcategory",
    }),
    fkClientState: foreignKey({
      columns: [table.stateId],
      foreignColumns: [states.stateId],
      name: "fk_client_state",
    }),
    ixClientCategory: index("ix_client_category").on(table.clientCategoryId),
    ixClientState: index("ix_client_state").on(table.stateId),
  }),
);

export const clusterSpaceClients = dbSchema.table(
  "cluster_space_client",
  {
    clusterSpaceClientId: bigint("cluster_space_client_id", { mode: "number" }).primaryKey(),
    clusterSpaceUuid: varchar("cluster_space_uuid", { length: 255 }).notNull().unique(),
    mainUrlDns: varchar("main_url_dns", { length: 255 }).notNull().unique(),
    typeUrlLogin: char("type_url_login", { length: 1 }).notNull(),
    urlLogin: varchar("url_login", { length: 255 }).notNull(),
    urlRedirectPostLogin: varchar("url_redirect_post_login", { length: 255 }),
    postLoginScript: text("post_login_script"),
    status: char("status", { length: 1 }).notNull().default("A"),
    timezone: varchar("timezone", { length: 15 }).notNull(),
    defaultLanguage: char("default_language", { length: 10 }).notNull(),
    defaultFormatdate: varchar("default_formatdate", { length: 50 }).notNull(),
    defaultFormattime: varchar("default_formattime", { length: 50 }).notNull(),
    defaultFormatdatetime: varchar("default_formatdatetime", { length: 50 }).notNull(),
    defaultFormatmoney: varchar("default_formatmoney", { length: 50 }).notNull(),
    messagingEngine: char("messaging_engine", { length: 5 }).notNull(),
    messagingConfig: text("messaging_config"),
    queueDataExchange: varchar("queue_data_exchange", { length: 120 }).notNull(),
    realm: varchar("realm", { length: 50 }).notNull(),
    monitorIngowner: char("monitor_ingowner", { length: 1 }).notNull(),
    homeUrl: varchar("home_url", { length: 255 }),
    workPlaceUrl: varchar("work_place_url", { length: 255 }),
    logo: text("logo"),
    logoReports: text("logo_reports"),
    clientId: bigint("client_id", { mode: "number" }),
    clusterId: bigint("cluster_id", { mode: "number" }),
    alias: varchar("alias", { length: 100 }).notNull().unique(),
    customUrlLogin: varchar("custom_url_login", { length: 255 }),
  },
  (table) => ({
    fkClusterspaceClient: foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.clientId],
      name: "fk_clusterspace_client",
    }),
    fkClusterspaceCluster: foreignKey({
      columns: [table.clusterId],
      foreignColumns: [clusters.clusterId],
      name: "fk_clusterspace_cluster",
    }),
    ixClusterspaceCluster: index("ix_clusterspace_cluster").on(table.clusterId),
    ixClusterspaceClient: index("ix_clusterspace_client").on(table.clientId),
  }),
);

export const clusterSpaceParameters = dbSchema.table(
  "cluster_space_parameter",
  {
    clusterSpaceParameterId: bigint("cluster_space_parameter_id", { mode: "number" }).primaryKey(),
    clusterSpaceParameterParentId: bigint("cluster_space_parameter_parent_id", { mode: "number" }),
    clusterSpaceClientId: bigint("cluster_space_client_id", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    parameterKey: varchar("parameter_key", { length: 256 }).notNull(),
    parameterValue: text("parameter_value"),
    parameterType: varchar("parameter_type", { length: 32 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    rotationIntervalDays: integer("rotation_interval_days"),
  },
  (table) => ({
    fkClusterSpaceParameterParent: foreignKey({
      columns: [table.clusterSpaceParameterParentId],
      foreignColumns: [table.clusterSpaceParameterId],
      name: "fk_cluster_space_parameter_parent",
    }),
    fkClusterSpaceParameterClusterSpaceClient: foreignKey({
      columns: [table.clusterSpaceClientId],
      foreignColumns: [clusterSpaceClients.clusterSpaceClientId],
      name: "fk_cluster_space_parameter_cluster_space_client",
    }),
    uqClusterSpaceParameterKey: unique(
      "cluster_space_parameter_cluster_space_client_id_cluster_spa_key",
    ).on(table.clusterSpaceClientId, table.clusterSpaceParameterParentId, table.parameterKey),
  }),
);

export type Country = typeof countries.$inferSelect;
export type State = typeof states.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Cluster = typeof clusters.$inferSelect;
export type ClientCategory = typeof clientCategories.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClusterSpaceClient = typeof clusterSpaceClients.$inferSelect;
export type ClusterSpaceParameter = typeof clusterSpaceParameters.$inferSelect;

export type NewParameter = typeof clusterSpaceParameters.$inferInsert;

export const insertParameterSchema: z.ZodSchema = z.lazy(() =>
  z.object({
    description: z.string().min(1, "Description is required"),
    key: z
      .string()
      .min(1, "Parameter key is required")
      .max(256, "Parameter key must be at most 256 characters"),
    value: z.string().optional().nullable(),
    type: z
      .string()
      .min(1, "Parameter type is required")
      .max(32, "Parameter type must be at most 32 characters"),
    parentId: z.number().optional().nullable(),
    children: z.array(insertParameterSchema).optional(),
    expiresAt: z.string().datetime().optional().nullable(),
    rotationIntervalDays: z.number().int().positive().optional().nullable(),
  }),
);

export const updateParameterSchema = z.object({
  description: z.string().min(1, "Description is required"),
  key: z
    .string()
    .min(1, "Parameter key is required")
    .max(256, "Parameter key must be at most 256 characters"),
  value: z.string().optional().nullable(),
  type: z
    .string()
    .min(1, "Parameter type is required")
    .max(32, "Parameter type must be at most 32 characters"),
  parentId: z.number().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  rotationIntervalDays: z.number().int().positive().optional().nullable(),
});
