import { describe, expect, test } from "bun:test";
import { findReferences, resolveReferences } from "./secret-resolver.ts";

describe("findReferences", () => {
  test("finds a single reference", () => {
    const refs = findReferences("prefix ${secret:db.password} suffix");
    expect(refs).toEqual(["db.password"]);
  });

  test("finds multiple references", () => {
    const refs = findReferences("user=${secret:db.user} pass=${secret:db.password}");
    expect(refs).toEqual(["db.user", "db.password"]);
  });

  test("returns empty for no references", () => {
    const refs = findReferences("just a plain string");
    expect(refs).toEqual([]);
  });

  test("handles nested path references", () => {
    const refs = findReferences("${secret:production.database.password}");
    expect(refs).toEqual(["production.database.password"]);
  });
});

describe("resolveReferences", () => {
  test("resolves a single reference", async () => {
    const resolver = async (path: string) => {
      if (path === "db.password") return "s3cret";
      return null;
    };
    const result = await resolveReferences(
      "postgres://user:${secret:db.password}@host/db",
      resolver,
    );
    expect(result).toBe("postgres://user:s3cret@host/db");
  });

  test("resolves multiple references", async () => {
    const resolver = async (path: string) => {
      const secrets: Record<string, string> = {
        "db.user": "admin",
        "db.password": "s3cret",
      };
      return secrets[path] ?? null;
    };
    const result = await resolveReferences(
      "postgres://${secret:db.user}:${secret:db.password}@host/db",
      resolver,
    );
    expect(result).toBe("postgres://admin:s3cret@host/db");
  });

  test("keeps unresolvable references unchanged", async () => {
    const resolver = async (_path: string) => null;
    const result = await resolveReferences("value is ${secret:missing.key}", resolver);
    expect(result).toBe("value is ${secret:missing.key}");
  });

  test("returns plain value unchanged", async () => {
    const resolver = async (_path: string) => "nope";
    const result = await resolveReferences("no references here", resolver);
    expect(result).toBe("no references here");
  });

  test("protects against circular references with max depth", async () => {
    // Circular: resolving A gives ${secret:B}, resolving B gives ${secret:A}
    const resolver = async (path: string) => {
      if (path === "a") return "${secret:b}";
      if (path === "b") return "${secret:a}";
      return null;
    };
    // Should not infinite loop, should stop at maxDepth
    const result = await resolveReferences("${secret:a}", resolver, 3);
    // After 3 levels of resolution, the pattern should still be there
    expect(result).toContain("${secret:");
  });

  test("handles nested resolution", async () => {
    const resolver = async (path: string) => {
      if (path === "config.db_url") return "postgres://user:${secret:config.db_pass}@host/db";
      if (path === "config.db_pass") return "actualpassword";
      return null;
    };
    const result = await resolveReferences("${secret:config.db_url}", resolver);
    expect(result).toBe("postgres://user:actualpassword@host/db");
  });
});
