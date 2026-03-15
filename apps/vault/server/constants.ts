export const APP_NAME = "vault";
export const APP_VERSION = "1.0.0";

export const DATABASE_URL = process.env.DATABASE_URL;
export const DATABASE_SCHEMA = "parameters";
export const PGLITE_PATH = process.env.PGLITE_PATH;

export const DEBUG = process.env.DEBUG === "true";

/** Fixed UUID used for the dev tenant when running with PGlite. */
export const DEV_TENANT_UUID = "dev-tenant-00000000-0000-0000-0000-000000000001";
