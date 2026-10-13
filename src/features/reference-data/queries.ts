import { useQuery } from "@tanstack/react-query";
import { referenceDataApi } from "./api";

export const referenceDataKeys = {
  options: (category: string, scope: string) => ["reference-data", "options", category, scope] as const,
};

/** Backend-managed option lists (static catalogs: cached for the session). */
export function useReferenceOptions(category: string, scope = "all", enabled = true) {
  return useQuery({
    queryKey: referenceDataKeys.options(category, scope),
    queryFn: () => referenceDataApi.options(category, scope),
    enabled,
    staleTime: Infinity,
  });
}
