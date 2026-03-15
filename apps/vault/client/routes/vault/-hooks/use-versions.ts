import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";

export type ParameterVersionEntry = {
  versionId: number;
  clusterSpaceParameterId: number;
  encryptedValue: string;
  version: number;
  createdAt: string;
  createdBy: string | null;
};

export function useParameterVersions(parameterId?: string) {
  return useQuery({
    queryKey: ["parameters", parameterId, "versions"],
    queryFn: async (): Promise<{ versions: ParameterVersionEntry[]; total: number }> => {
      const res = await api.vault[":id"].versions.$get({
        param: { id: parameterId! },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to fetch versions");
      }
      return data as { versions: ParameterVersionEntry[]; total: number };
    },
    enabled: !!parameterId,
  });
}

export function useRollbackVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parameterId,
      versionId,
    }: {
      parameterId: string;
      versionId: string;
    }): Promise<any> => {
      const res = await api.vault[":id"].rollback[":versionId"].$post({
        param: { id: parameterId, versionId },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to rollback");
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate versions and parameters queries
      queryClient.invalidateQueries({
        queryKey: ["parameters", variables.parameterId, "versions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["parameters", variables.parameterId, "audit-log"],
      });
      queryClient.invalidateQueries({ queryKey: ["parameters"] });
    },
  });
}
