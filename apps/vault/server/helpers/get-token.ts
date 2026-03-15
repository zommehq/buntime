import type { Context } from "hono";
import { getCookie } from "hono/cookie";

export function getToken(ctx: Context) {
  return (
    ctx.req.header("authorization")?.replace("Bearer ", "") || getCookie(ctx, "HYPER-AUTH-TOKEN")
  );
}
