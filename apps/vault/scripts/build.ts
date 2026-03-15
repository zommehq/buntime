#!/usr/bin/env bun

import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const rootDir = join(import.meta.dir, "..");
const distDir = join(rootDir, "dist");

// Clean
if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });

console.log("Building project...");

const [serverResult] = await Promise.all([
  Bun.build({
    entrypoints: [join(rootDir, "index.ts")],
    target: "bun",
    outdir: distDir,
    minify: true,
    splitting: true,
    external: ["@buntime/shared"],
  }),
  Bun.spawn(["bunx", "vite", "build"], {
    cwd: rootDir,
    stdio: ["inherit", "inherit", "inherit"],
  }).exited,
]);

if (!serverResult.success) {
  console.error("Server build failed:", serverResult.logs);
  process.exit(1);
}

// Copy migrations
const migrationsDir = join(rootDir, "server/migrations");
if (existsSync(migrationsDir)) {
  cpSync(migrationsDir, join(distDir, "migrations"), { recursive: true });
}

console.log("Build completed!");
