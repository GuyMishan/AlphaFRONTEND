import { useInfiniteQuery, useQuery, type QueryClient } from "@tanstack/react-query";
import { billingKeys } from "@/features/billing/queries";
import { invalidateScopeContext } from "@/features/scope/scope-context";
import { employersApi } from "./api";

/** Keys are rooted at the organization so cached data never mixes tenants. */
export const employerKeys = {
  all: ["employers"] as const,
  organization: (organizationId: string) => [...employerKeys.all, organizationId] as const,
  list: (organizationId: string) => [...employerKeys.organization(organizationId), "list"] as const,
  search: (organizationId: string, search: string, pageSize: number) =>
    [...employerKeys.organization(organizationId), "search", { search, pageSize }] as const,
  detail: (organizationId: string, employerId: string) => [...employerKeys.organization(organizationId), employerId] as const,
  capabilities: (organizationId: string, employerId: string) => [...employerKeys.detail(organizationId, employerId), "capabilities"] as const,
  settings: (organizationId: string, employerId: string) => [...employerKeys.detail(organizationId, employerId), "profile-settings"] as const,
};

/** Paged employer search within an organization (offset paging through `skip`). */
export function useEmployerSearch(organizationId: string, search: string, pageSize: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: employerKeys.search(organizationId, search, pageSize),
    queryFn: ({ pageParam, signal }) => employersApi.employerSearch(organizationId, search, pageParam, pageSize, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.reduce((count, page) => count + page.items.length, 0) : undefined,
    enabled: enabled && Boolean(organizationId),
  });
}

export function useOrganizationEmployers(organizationId: string) {
  return useQuery({
    queryKey: employerKeys.list(organizationId),
    queryFn: ({ signal }) => employersApi.employers(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}

export function useEmployer(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: employerKeys.detail(organizationId, employerId),
    queryFn: ({ signal }) => employersApi.employer(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}

/** What the current user may do for this employer (backend-authoritative; UI uses it for presentation only). */
export function useEmployerCapabilities(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: employerKeys.capabilities(organizationId, employerId),
    queryFn: ({ signal }) => employersApi.employerCapabilities(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}

export function useEmployerProfileSettings(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: employerKeys.settings(organizationId, employerId),
    queryFn: ({ signal }) => employersApi.employerProfileCenterSettings(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}

/**
 * Refreshes cached data after an employer was created or edited: the employer
 * itself, organization employer lists/searches, the access scope (names shown in
 * selectors) and plan usage.
 */
export function invalidateEmployerData(queryClient: QueryClient, organizationId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: employerKeys.organization(organizationId) }),
    queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) }),
    invalidateScopeContext(),
  ]);
}
