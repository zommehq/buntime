import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: ["./server/**/*.schema.ts"],
  out: "./server/migrations",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    schema: "vault",
  },
} satisfies Config;
