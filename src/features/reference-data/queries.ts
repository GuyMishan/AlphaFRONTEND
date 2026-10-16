import { useQuery } from "@tanstack/react-query";
import { referenceDataApi } from "./api";

export const referenceDataKeys = {
  options: (category: string, scope: string) => ["reference-data", "options", category, scope] as const,
  cities: (search: string) => ["reference-data", "cities", search] as const,
  streets: (cityCode: number | null, search: string) => ["reference-data", "streets", cityCode, search] as const,
};

export function useCities(search: string, enabled: boolean) {
  return useQuery({
    queryKey: referenceDataKeys.cities(search),
    queryFn: () => referenceDataApi.cities(search, 30),
    enabled: enabled && search.length >= 2,
  });
}

export function useStreets(cityCode: number | null, search: string, enabled: boolean) {
  return useQuery({
    queryKey: referenceDataKeys.streets(cityCode, search),
    queryFn: () => referenceDataApi.streets(cityCode!, search, 40),
    enabled: enabled && cityCode !== null,
  });
}

/** Backend-managed option lists (static catalogs: cached for the session). */
export function useReferenceOptions(category: string, scope = "all", enabled = true) {
  return useQuery({
    queryKey: referenceDataKeys.options(category, scope),
    queryFn: () => referenceDataApi.options(category, scope),
    enabled,
    staleTime: Infinity,
  });
}
