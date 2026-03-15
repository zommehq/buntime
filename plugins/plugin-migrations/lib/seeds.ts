import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { PluginLogger } from "@buntime/shared/types";

/**
 * Get file patterns for JavaScript/TypeScript files
 */
function getFilePattern(): RegExp[] {
  return [/\.js$/, /\.ts$/, /\.mjs$/, /\.mts$/];
}

/**
 * Run seed scripts
 */
export async function runSeeds(db: any, seedsFolder: string, log: PluginLogger): Promise<void> {
  if (!existsSync(seedsFolder)) {
    log.warn(`Seeds folder not found: ${seedsFolder}`);
    return;
  }

  try {
    const files = await readdir(seedsFolder);
    const patterns = getFilePattern();

    // Filter and sort seed files
    const seedFiles = files.filter((file) => patterns.some((pattern) => pattern.test(file))).sort();

    if (seedFiles.length === 0) {
      log.info("No seed files found");
      return;
    }

    log.info(`Running ${seedFiles.length} seed script(s)`);

    for (const file of seedFiles) {
      const seedPath = join(seedsFolder, file);
      log.info(`Running seed: ${file}`);

      try {
        const seed = await import(seedPath);
        const seedFn = seed.default || seed;

        if (typeof seedFn === "function") {
          await seedFn(db);
          log.info(`Seed completed: ${file}`);
        } else {
          log.warn(`Seed file has no default export: ${file}`);
        }
      } catch (err) {
        log.error(
          `Error running seed ${file}:`,
          err instanceof Error ? { error: err.message } : undefined,
        );
        // Continue with other seeds even if one fails
      }
    }

    log.info("All seeds completed");
  } catch (err) {
    log.error("Error running seeds:", err instanceof Error ? { error: err.message } : undefined);
    throw err;
  }
}
