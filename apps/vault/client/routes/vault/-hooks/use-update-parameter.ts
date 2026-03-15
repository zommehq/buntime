import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { Parameter } from "../-types.ts";

interface UpdateParameterInput {
  id: string;
  description: string;
  key: string;
  type: string;
  value?: string | null;
  parentId?: number | null;
  expiresAt?: string | null;
  rotationIntervalDays?: number | null;
}

export function useUpdateParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateParameterInput) => {
      const res = await api.vault[":id"].$put({
        param: { id },
        json: data,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error((json as { error: string }).error ?? "Failed to update parameter");
      }
      return json as unknown as Parameter;
    },

    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: ["parameters"] });

      const queryCache = queryClient.getQueryCache();
      const snapshots: Array<{ queryKey: string[]; data: Parameter[] }> = [];

      queryCache.findAll({ queryKey: ["parameters"] }).forEach((query) => {
        const queryData = query.state.data as Parameter[] | undefined;
        if (queryData?.some((param) => param.id === id)) {
          snapshots.push({
            queryKey: query.queryKey as string[],
            data: [...queryData],
          });

          queryClient.setQueryData<Parameter[]>(query.queryKey, (old = []) =>
            old.map((param) =>
              param.id === id
                ? ({
                    ...param,
                    ...data,
                    updatedAt: new Date().toISOString(),
                  } as Parameter)
                : param,
            ),
          );
        }
      });

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      if (context?.snapshots) {
        context.snapshots.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["parameters"] });
    },
  });
}
