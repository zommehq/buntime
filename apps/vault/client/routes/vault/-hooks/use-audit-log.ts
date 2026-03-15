import { useQuery } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";

type AuditLogEntry = {
  auditLogId: number;
  clusterSpaceParameterId: number | null;
  clusterSpaceClientId: number;
  parameterKey: string;
  action: string;
  actorEmail: string | null;
  actorUsername: string | null;
  ipAddress: string | null;
  oldValueHash: string | null;
  createdAt: string;
};

export type { AuditLogEntry };

export function useParameterAuditLog(parameterId?: string) {
  return useQuery({
    queryKey: ["parameters", parameterId, "audit-log"],
    queryFn: async (): Promise<{ entries: AuditLogEntry[]; total: number }> => {
      const res = await api.vault[":id"]["audit-log"].$get({
        param: { id: parameterId! },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to fetch audit log");
      }
      return data as { entries: AuditLogEntry[]; total: number };
    },
    enabled: !!parameterId,
  });
}
