import { useQuery } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { Parameter } from "../-types.ts";

export function useGroups() {
  return useQuery({
    queryKey: ["parameters", "groups"],
    queryFn: async (): Promise<Parameter[]> => {
      const res = await api.vault.$get({ query: { onlyRoots: "true" } });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to fetch groups");
      }
      return data as Parameter[];
    },
  });
}
