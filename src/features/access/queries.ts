import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { accessApi } from "./api";

/** Organization access management. Keys are rooted at the organization. */
export const accessKeys = {
  organization: (organizationId: string) => ["access", organizationId] as const,
  users: (organizationId: string, employerId: string, search: string, pageSize: number) =>
    [...accessKeys.organization(organizationId), "users", { employerId, search, pageSize }] as const,
  invitations: (organizationId: string) => [...accessKeys.organization(organizationId), "invitations"] as const,
};

/** Members of an organization (optionally narrowed to one employer), paged by `skip`. */
export function useAccessUsers(organizationId: string, employerId: string, search: string, pageSize: number) {
  return useInfiniteQuery({
    queryKey: accessKeys.users(organizationId, employerId, search, pageSize),
    queryFn: ({ pageParam, signal }) => accessApi.accessUsers(organizationId, search, pageParam, pageSize, employerId, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.reduce((count, page) => count + page.items.length, 0) : undefined,
    enabled: Boolean(organizationId),
  });
}

export function useInvitations(organizationId: string) {
  return useQuery({
    queryKey: accessKeys.invitations(organizationId),
    queryFn: ({ signal }) => accessApi.invitations(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}
