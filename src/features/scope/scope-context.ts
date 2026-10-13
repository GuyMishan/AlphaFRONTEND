import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";
import type { GlobalScopeContext } from "@/features/scope/types";
import { scopeApi } from "./api";

/**
 * The organizations/employers the signed-in user may access (`GET /api/scope`).
 * Server state: cached by TanStack Query, shared by the shell, the scope
 * controller and pages. It stays fresh until explicitly invalidated after a
 * change that affects access (onboarding, employer create/transfer, ...).
 */
export const scopeKeys = {
  all: ["scope"] as const,
  context: () => [...scopeKeys.all, "context"] as const,
};

const scopeQuery = {
  queryKey: scopeKeys.context(),
  queryFn: () => scopeApi.scope(),
  staleTime: Infinity,
};

export function useScopeContext() {
  return useQuery(scopeQuery);
}

/** Imperative access for async flows; de-duplicates concurrent requests. */
export function getScopeContext(force = false): Promise<GlobalScopeContext> {
  const client = getQueryClient();
  if (force) client.removeQueries({ queryKey: scopeKeys.context() });
  return client.fetchQuery(scopeQuery);
}

/** Marks the scope stale; active observers refetch immediately. */
export function invalidateScopeContext() {
  return getQueryClient().invalidateQueries({ queryKey: scopeKeys.all });
}

export function refreshScopeContext() {
  return getScopeContext(true);
}
