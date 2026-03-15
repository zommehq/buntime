import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { openAPIRouteHandler } from "hono-openapi";
import { setTenantDb } from "./middleware/set-tenant-db.ts";
import vaultRoutes from "./routes/vault/vault.route.ts";
import { autoTracing } from "./utils/tracing.ts";

const isDev = process.env.NODE_ENV !== "production";

const base = new Hono();

if (isDev) {
  base.use(cors({ origin: (origin) => origin, credentials: true }));
}

const api = base
  .use(setTenantDb)
  .use(autoTracing)
  .route("/vault", vaultRoutes)
  .onError((err) => {
    if (err instanceof HTTPException) {
      return new Response(JSON.stringify({ error: err.cause, message: err.message }), {
        status: err.getResponse().status,
      });
    }

    return new Response("Internal Server Error", { status: 500 });
  });

export type AppType = typeof api;

const app = new Hono()
  .route("/api", api)
  .get("/health", (ctx) => ctx.json({ health: "ok" }, 200))
  .get(
    "/openapi.json",
    openAPIRouteHandler(api, {
      documentation: {
        openapi: "3.1.0",
        info: {
          version: "1.0.0",
          title: "Vault API",
          description: "API for managing vault parameters and secrets.",
        },
        servers: [
          { url: "/vault/api", description: "Buntime Worker" },
          { url: "/api", description: "Standalone Local Server" },
        ],
      },
    }),
  )
  .get(
    "/docs",
    Scalar({
      url: "openapi.json",
      theme: "purple",
      metaData: {
        title: "Vault API",
      },
    }),
  );

if (isDev) {
  app.get("/api/set-cookie", (ctx) => {
    const token = ctx.req.query("token");
    if (token) {
      ctx.header("Set-Cookie", `HYPER-AUTH-TOKEN=${token}; Path=/; HttpOnly; SameSite=Strict`);
      return ctx.json({ success: true });
    }
    return ctx.json({ success: false, message: "Token não fornecido" }, 400);
  });
}

export default app;
