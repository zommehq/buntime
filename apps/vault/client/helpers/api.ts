import { hc } from "hono/client";
import type { AppType } from "@/index.ts";

export type Client = ReturnType<typeof hc<AppType>>;

export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args);

// Keep API base relative so the app works under /vault with <base href>.
export const api = hcWithType("api", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, { ...init, credentials: "include" });
  },
});
