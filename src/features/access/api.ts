import { apiRequest, queryString } from "@/lib/api/client";
import type { PagedResult } from "@/lib/api/paging";
import type {
  AccessEmployer,
  AccessUser,
  CreateInvitationInput,
  EmployerAccessMode,
  EmployerOption,
  EmployerRole,
  OrganizationRole,
  UserInvitation,
} from "@/features/access/types";

export type AccessPermissions = {
  role: OrganizationRole;
  employerAccessMode: EmployerAccessMode;
  canCreateEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canCreateReport: boolean;
  canTransmitReport: boolean;
};

const organizationPath = (organizationId: string) => `/api/organizations/${organizationId}`;
const userPath = (organizationId: string, userId: string) => `${organizationPath(organizationId)}/access/users/${userId}`;

/** Organization membership, roles, employer assignments and invitations. */
export const accessApi = {
  invitations: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<UserInvitation[]>(`${organizationPath(organizationId)}/invitations`, { signal }),
  createInvitation: (organizationId: string, payload: CreateInvitationInput) =>
    apiRequest<UserInvitation>(`${organizationPath(organizationId)}/invitations`, { method: "POST", body: payload }),
  cancelInvitation: (organizationId: string, invitationId: string) =>
    apiRequest<void>(`${organizationPath(organizationId)}/invitations/${invitationId}/cancel`, { method: "POST" }),

  accessUsers: (organizationId: string, search = "", skip = 0, take = 30, employerId = "", signal?: AbortSignal) =>
    apiRequest<PagedResult<AccessUser>>(`${organizationPath(organizationId)}/access/users${queryString({ search, skip, take, employerId })}`, { signal }),
  updateUserType: (organizationId: string, userId: string, payload: AccessPermissions & { type: "platform" | "organization" | "employer"; employers: { employerId: string; role: EmployerRole }[] }) =>
    apiRequest<void>(`${userPath(organizationId, userId)}/type`, { method: "PUT", body: payload }),
  updateAccessUser: (organizationId: string, userId: string, payload: AccessPermissions) =>
    apiRequest<void>(userPath(organizationId, userId), { method: "PUT", body: payload }),
  removeAccessUser: (organizationId: string, userId: string) =>
    apiRequest<void>(userPath(organizationId, userId), { method: "DELETE" }),

  assignedEmployers: (organizationId: string, userId: string, search = "", skip = 0, take = 30) =>
    apiRequest<PagedResult<AccessEmployer>>(`${userPath(organizationId, userId)}/employers${queryString({ search, skip, take })}`),
  employerAccessOptions: (organizationId: string, userId: string, search: string, take = 20) =>
    apiRequest<EmployerOption[]>(`${organizationPath(organizationId)}/access/employer-options${queryString({ userId, search, take })}`),
  grantEmployerAccess: (organizationId: string, userId: string, employerId: string) =>
    apiRequest<void>(`${userPath(organizationId, userId)}/employers/${employerId}`, { method: "POST" }),
  updateEmployerAccessRole: (organizationId: string, userId: string, employerId: string, role: EmployerRole) =>
    apiRequest<void>(`${userPath(organizationId, userId)}/employers/${employerId}/role`, { method: "PUT", body: { role } }),
  revokeEmployerAccess: (organizationId: string, userId: string, employerId: string) =>
    apiRequest<void>(`${userPath(organizationId, userId)}/employers/${employerId}`, { method: "DELETE" }),
};
