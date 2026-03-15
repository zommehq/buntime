import { hashValue } from "@/helpers/crypto.ts";
import type { AuditLogEntry } from "@/routes/vault/audit-log.schema.ts";
import type { AuditLogRepository } from "../repositories/audit-log.repository.ts";

export type AuditAction = "created" | "updated" | "deleted" | "revealed" | "rotated";

export class AuditLogService {
  constructor(private auditLogRepository: AuditLogRepository) {}

  async log(params: {
    parameterId: number | null;
    clientId: number;
    parameterKey: string;
    action: AuditAction;
    actorEmail?: string;
    actorUsername?: string;
    ipAddress?: string;
    oldValue?: string;
  }): Promise<void> {
    let oldValueHash: string | undefined;

    if (params.oldValue) {
      oldValueHash = await hashValue(params.oldValue);
    }

    await this.auditLogRepository.createEntry({
      clusterSpaceParameterId: params.parameterId,
      clusterSpaceClientId: params.clientId,
      parameterKey: params.parameterKey,
      action: params.action,
      actorEmail: params.actorEmail ?? null,
      actorUsername: params.actorUsername ?? null,
      ipAddress: params.ipAddress ?? null,
      oldValueHash: oldValueHash ?? null,
    });
  }

  async getParameterActivity(
    parameterId: number,
    limit?: number,
    offset?: number,
  ): Promise<AuditLogEntry[]> {
    return this.auditLogRepository.findByParameterId(parameterId, limit, offset);
  }

  async getAuditLog(
    clientId: number,
    filters: {
      limit?: number;
      offset?: number;
      action?: string;
      actorEmail?: string;
      parameterKey?: string;
    } = {},
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    return this.auditLogRepository.findByClientId(clientId, filters);
  }
}
