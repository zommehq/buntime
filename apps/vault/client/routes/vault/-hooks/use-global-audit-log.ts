import { useQuery } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { AuditLogEntry } from "./use-audit-log.ts";

interface GlobalAuditLogFilters {
  action?: string;
  actorEmail?: string;
  limit?: number;
  offset?: number;
  parameterKey?: string;
}

export function useGlobalAuditLog(filters: GlobalAuditLogFilters) {
  return useQuery({
    queryKey: ["audit-log", "global", filters],
    queryFn: async (): Promise<{ entries: AuditLogEntry[]; total: number }> => {
      const query: Record<string, string> = {};
      if (filters.limit) query.limit = String(filters.limit);
      if (filters.offset) query.offset = String(filters.offset);
      if (filters.action) query.action = filters.action;
      if (filters.actorEmail) query.actorEmail = filters.actorEmail;
      if (filters.parameterKey) query.parameterKey = filters.parameterKey;

      const res = await api.vault["audit-log"].$get({ query });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to fetch audit log");
      }
      return data as { entries: AuditLogEntry[]; total: number };
    },
  });
}
