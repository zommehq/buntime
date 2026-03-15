import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { Parameter } from "../-types.ts";

export function useDeleteParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parameter: Parameter): Promise<void> => {
      const res = await api.vault[":id"].$delete({ param: { id: parameter.id } });

      if (!res.ok) {
        const data = await res.json();
        throw new Error((data as { error: string }).error ?? "Failed to delete parameter");
      }
    },

    onMutate: async (parameter: Parameter) => {
      await queryClient.cancelQueries({ queryKey: ["parameters"] });

      const queryCache = queryClient.getQueryCache();
      const snapshots: Array<{ queryKey: string[]; data: Parameter[] }> = [];

      queryCache.findAll({ queryKey: ["parameters"] }).forEach((query) => {
        const data = query.state.data as Parameter[] | undefined;
        if (data?.some((param: Parameter) => param.id === parameter.id)) {
          snapshots.push({
            queryKey: query.queryKey as string[],
            data: [...data],
          });

          // Optimistically remove the parameter
          queryClient.setQueryData<Parameter[]>(query.queryKey, (old = []) =>
            old.filter((param: Parameter) => param.id !== parameter.id),
          );
        }
      });

      return { snapshots };
    },

    onError: (_err: Error, _parameter: Parameter, context: any) => {
      if (context?.snapshots) {
        context.snapshots.forEach(
          ({ queryKey, data }: { queryKey: string[]; data: Parameter[] }) => {
            queryClient.setQueryData(queryKey, data);
          },
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["parameters"] });
    },
  });
}
