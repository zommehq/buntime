import { join } from "node:path";
import server from "./server";

const clientDir = join(import.meta.dir, "dist/client");
const INDEX_FILE = join(clientDir, "index.html");

function resolveAssetPath(url: URL): string | null {
  const pathname = decodeURIComponent(url.pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");

  // Basic traversal guard
  if (relative.includes("..")) {
    return null;
  }

  return join(clientDir, relative);
}

async function serveClient(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const assetPath = resolveAssetPath(url);

  if (assetPath) {
    const asset = Bun.file(assetPath);
    if (await asset.exists()) {
      return new Response(asset, { headers: { "Content-Type": asset.type } });
    }
  }

  // SPA fallback
  const index = Bun.file(INDEX_FILE);
  return new Response(index, { headers: { "Content-Type": index.type } });
}

export default {
  routes: {
    "/api/*": server.fetch,
    "/api/set-cookie": server.fetch,
    "/health": server.fetch,
    "/openapi.json": server.fetch,
    "/docs": server.fetch,
  },
  fetch: serveClient,
};
