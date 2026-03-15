import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/helpers/api.ts";
import type { Parameter } from "../-types.ts";

type CreateParameterInput = Omit<Parameter, "id" | "createdAt" | "updatedAt">;

export function useCreateParameter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parameter: CreateParameterInput): Promise<Parameter> => {
      const res = await api.vault.$post({ json: parameter });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error: string }).error ?? "Failed to create parameter");
      }
      return data as unknown as Parameter;
    },
    onMutate: async (newParameter: CreateParameterInput) => {
      await queryClient.cancelQueries({ queryKey: ["parameters"] });

      const queryKey = newParameter.parentId
        ? ["parameters", "children", newParameter.parentId]
        : ["parameters", "groups"];

      const previousParameters = queryClient.getQueryData<Parameter[]>(queryKey);

      const optimisticParameter: Parameter = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: undefined,
        ...newParameter,
      };

      queryClient.setQueryData<Parameter[]>(queryKey, (old = []) => [...old, optimisticParameter]);

      return { previousParameters, queryKey };
    },
    onError: (_err: Error, _newParameter: CreateParameterInput, context: any) => {
      if (context?.previousParameters && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousParameters);
      }
    },
    onSettled: (
      _data: Parameter | undefined,
      _error: Error | null,
      variables: CreateParameterInput,
    ) => {
      const queryKey = variables.parentId
        ? ["parameters", "children", variables.parentId]
        : ["parameters", "groups"];

      queryClient.invalidateQueries({ queryKey });

      if (!variables.parentId) {
        queryClient.invalidateQueries({ queryKey: ["parameters", "groups"] });
      }
    },
  });
}
