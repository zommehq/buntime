import { useMutation } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";

export function useRevealParameter() {
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const res = await api.vault[":id"].reveal.$get({ param: { id } });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to reveal secret");
      }
      return (data as { value: string }).value;
    },
  });
}
