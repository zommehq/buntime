import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { DatabaseAdapter, PgliteAdapterConfig, Statement, TransactionAdapter } from "../types";

export class PgliteAdapter implements DatabaseAdapter {
  readonly type = "pglite" as const;
  readonly tenantId: string | null;
  readonly url: string;

  private readonly client: PGlite;
  private readonly config: PgliteAdapterConfig;

  constructor(config: PgliteAdapterConfig, tenantId: string | null = null) {
    this.config = config;
    this.tenantId = tenantId;
    this.url = this.resolveUrl(config, tenantId);
    this.client = new PGlite(this.url);
  }

  getRawClient(): PGlite {
    return this.client;
  }

  getUrl(): string {
    return this.url;
  }

  private sanitizeTenantId(tenantId: string): string {
    return tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private buildTenantUrl(baseUrl: string, tenantId: string): string {
    if (baseUrl.startsWith("memory://")) {
      return `memory://${tenantId}`;
    }
    return `${baseUrl}_${tenantId}`;
  }

  private resolveUrl(config: PgliteAdapterConfig, tenantId: string | null): string {
    if (config.baseDir) {
      mkdirSync(config.baseDir, { recursive: true });
      return join(config.baseDir, tenantId ? this.sanitizeTenantId(tenantId) : "_default");
    }

    if (config.url) {
      if (!tenantId) {
        return config.url;
      }
      return this.buildTenantUrl(config.url, this.sanitizeTenantId(tenantId));
    }

    throw new Error("PgliteAdapter requires either baseDir or url");
  }

  async execute<T = unknown>(sql: string, args?: unknown[]): Promise<T[]> {
    const result =
      args && args.length > 0
        ? await this.client.query<T>(sql, args as never[])
        : await this.client.query<T>(sql);
    return result.rows as T[];
  }

  async executeOne<T = unknown>(sql: string, args?: unknown[]): Promise<T | null> {
    const rows = await this.execute<T>(sql, args);
    return rows[0] ?? null;
  }

  async batch(statements: Statement[]): Promise<void> {
    await this.transaction(async (tx) => {
      for (const stmt of statements) {
        await tx.execute(stmt.sql, stmt.args);
      }
    });
  }

  async transaction<T>(fn: (tx: TransactionAdapter) => Promise<T>): Promise<T> {
    await this.client.query("BEGIN");

    try {
      const tx: TransactionAdapter = {
        execute: async <R = unknown>(sql: string, args?: unknown[]): Promise<R[]> =>
          this.execute<R>(sql, args),
        executeOne: async <R = unknown>(sql: string, args?: unknown[]): Promise<R | null> =>
          this.executeOne<R>(sql, args),
      };

      const result = await fn(tx);
      await this.client.query("COMMIT");
      return result;
    } catch (error) {
      await this.client.query("ROLLBACK");
      throw error;
    }
  }

  async getTenant(tenantId: string): Promise<DatabaseAdapter> {
    return new PgliteAdapter(this.config, tenantId);
  }

  async createTenant(tenantId: string): Promise<void> {
    const tenantAdapter = await this.getTenant(tenantId);
    try {
      await tenantAdapter.execute("SELECT 1");
      this.config.logger?.info(`Created pglite tenant: ${tenantId}`);
    } finally {
      await tenantAdapter.close();
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    if (!this.config.baseDir) {
      this.config.logger?.warn(
        `Cannot delete pglite tenant ${tenantId}: baseDir is required for tenant cleanup`,
      );
      return;
    }

    const tenantPath = join(this.config.baseDir, this.sanitizeTenantId(tenantId));
    rmSync(tenantPath, { force: true, recursive: true });
    this.config.logger?.info(`Deleted pglite tenant: ${tenantId}`);
  }

  async listTenants(): Promise<string[]> {
    if (!this.config.baseDir) {
      return [];
    }

    return readdirSync(this.config.baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "_default")
      .map((entry) => entry.name);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
