import { Hono } from "hono";
import { PORT } from "./constants";
import { errorToResponse } from "./libs/errors";
import { pool } from "./libs/pool";
import { proxy } from "./libs/proxy";
import internal from "./routes/internal/index";
import workers from "./routes/worker";

const app = new Hono().route("/_", internal).route("/", workers).onError(errorToResponse);

const server = Bun.serve({
  fetch: app.fetch,
  port: PORT,
  websocket: proxy.websocketHandler,
});

proxy.setServer(server);

console.log(`Server running at ${server.url}`);

process.on("SIGINT", function () {
  console.log("\n[Main] Shutting down...");
  pool.shutdown();
  process.exit(0);
});

export type AppType = typeof app;

export default app;
