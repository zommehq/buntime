import type { Context, Next } from "hono";
import { DATABASE_URL, DEV_TENANT_UUID, PGLITE_PATH } from "@/constants.ts";
import { type Db, getDrizzleInstance } from "@/helpers/drizzle.ts";
import { getToken } from "@/helpers/get-token.ts";
import { getTokenPayload } from "@/helpers/jwt.ts";
import { parseDatabaseUrl } from "@/utils/database.ts";

const isDev = process.env.NODE_ENV !== "production";

export type Env = {
  Variables: {
    db: Db;
    tenantId: string;
    hyperClusterSpace: string;
    actorEmail: string | undefined;
    actorUsername: string | undefined;
  };
};

declare module "hono" {
  interface ContextVariableMap {
    db: Db;
    tenantId: string;
    hyperClusterSpace: string;
    actorEmail: string | undefined;
    actorUsername: string | undefined;
  }
}

export const setTenantDb = async (ctx: Context, next: Next) => {
  const conn = parseDatabaseUrl(ctx.req.header("x-database-url")) || DATABASE_URL;

  const token = getToken(ctx);

  // Dev bypass: when running locally with PGlite and no token is provided,
  // use the mock tenant UUID so the SPA works without authentication.
  if (!token && isDev && PGLITE_PATH) {
    ctx.set("db", await getDrizzleInstance({ connectionString: conn }));
    ctx.set("tenantId", DEV_TENANT_UUID);
    ctx.set("hyperClusterSpace", DEV_TENANT_UUID);
    ctx.set("actorEmail", "dev@localhost");
    ctx.set("actorUsername", "dev-user");
    return await next();
  }

  if (!token) {
    return ctx.json({ error: "Token is required" }, 401);
  }

  const payload = getTokenPayload(token);
  if (!payload || !payload.hyper_cluster_space) {
    return ctx.json({ error: "Invalid token or missing hyper_cluster_space" }, 401);
  }

  ctx.set("db", await getDrizzleInstance({ connectionString: conn }));
  ctx.set("tenantId", ctx.req.header("x-tenant-id") || payload.hyper_cluster_space);
  ctx.set("hyperClusterSpace", payload.hyper_cluster_space);
  ctx.set("actorEmail", payload.email);
  ctx.set("actorUsername", payload.preferred_username);

  return await next();
};
