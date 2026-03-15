import { useQuery } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { Parameter } from "../-types.ts";

export function useParameters(parentId?: string) {
  return useQuery({
    queryKey: ["parameters", "children", parentId],
    queryFn: async (): Promise<Parameter[]> => {
      if (!parentId) {
        return [];
      }

      const res = await api.vault[":id"].children.$get({
        param: { id: parentId },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to fetch parameters");
      }

      return (data as Parameter[]).map((param) => ({
        ...param,
        parentId,
      }));
    },
    enabled: !!parentId,
  });
}
