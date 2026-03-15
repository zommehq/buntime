import { and, count, desc, eq, ilike } from "drizzle-orm";
import type { Db } from "../helpers/drizzle.ts";
import {
  type AuditLogEntry,
  type NewAuditLogEntry,
  parameterAuditLog,
} from "../routes/vault/audit-log.schema.ts";

export class AuditLogRepository {
  constructor(private db: Db) {}

  async createEntry(data: NewAuditLogEntry): Promise<void> {
    await this.db.insert(parameterAuditLog).values(data);
  }

  async findByParameterId(parameterId: number, limit = 20, offset = 0): Promise<AuditLogEntry[]> {
    return this.db
      .select()
      .from(parameterAuditLog)
      .where(eq(parameterAuditLog.clusterSpaceParameterId, parameterId))
      .orderBy(desc(parameterAuditLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findByClientId(
    clientId: number,
    opts: {
      limit?: number;
      offset?: number;
      action?: string;
      actorEmail?: string;
      parameterKey?: string;
    } = {},
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const { limit = 25, offset = 0, action, actorEmail, parameterKey } = opts;

    const conditions = [eq(parameterAuditLog.clusterSpaceClientId, clientId)];

    if (action) {
      conditions.push(eq(parameterAuditLog.action, action));
    }
    if (actorEmail) {
      conditions.push(ilike(parameterAuditLog.actorEmail, `%${actorEmail}%`));
    }
    if (parameterKey) {
      conditions.push(ilike(parameterAuditLog.parameterKey, `%${parameterKey}%`));
    }

    const whereClause = and(...conditions);

    const [entries, totalResult] = await Promise.all([
      this.db
        .select()
        .from(parameterAuditLog)
        .where(whereClause)
        .orderBy(desc(parameterAuditLog.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(parameterAuditLog).where(whereClause),
    ]);

    return { entries, total: totalResult[0]?.count ?? 0 };
  }
}
