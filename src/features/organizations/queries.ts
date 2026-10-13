import { useMutation, useQuery } from "@tanstack/react-query";
import { invalidateScopeContext } from "@/features/scope/scope-context";
import { organizationsApi } from "./api";

export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  detail: (organizationId: string) => [...organizationKeys.all, organizationId] as const,
  capabilities: (organizationId: string) => [...organizationKeys.detail(organizationId), "capabilities"] as const,
  profile: (organizationId: string) => [...organizationKeys.detail(organizationId), "profile"] as const,
  members: (organizationId: string) => [...organizationKeys.detail(organizationId), "members"] as const,
  employerBilling: (organizationId: string) => [...organizationKeys.detail(organizationId), "employer-billing"] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: ({ signal }) => organizationsApi.organizations(signal),
  });
}

export function useOrganizationCapabilities(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: organizationKeys.capabilities(organizationId),
    queryFn: ({ signal }) => organizationsApi.capabilities(organizationId, signal),
    enabled: enabled && Boolean(organizationId),
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: organizationsApi.createOrganization,
    // A new organization changes what the user can access.
    onSuccess: () => invalidateScopeContext(),
  });
}

export function useOrganizationProfile(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.profile(organizationId),
    queryFn: ({ signal }) => organizationsApi.organizationProfile(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}

export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.members(organizationId),
    queryFn: ({ signal }) => organizationsApi.organizationMembers(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}

export function useOrganizationEmployerBilling(organizationId: string) {
  return useQuery({
    queryKey: organizationKeys.employerBilling(organizationId),
    queryFn: ({ signal }) => organizationsApi.organizationEmployerBilling(organizationId, signal),
    enabled: Boolean(organizationId),
  });
}
