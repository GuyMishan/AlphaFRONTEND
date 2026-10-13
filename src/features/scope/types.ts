import type { EmployerRole } from "@/features/access/types";
import type { Employer } from "@/features/employers/types";

export type OnboardingStatus = {
  needsOnboarding: boolean;
  hasAccess: boolean;
};

export type SelfServiceOnboardingResult = {
  organizationId: string;
  employerId: string;
  employer: Employer;
  employerRole: EmployerRole;
};

export type ScopeEmployer = Pick<Employer,
  "id" | "organizationId" | "legalName" | "registrationNumber" | "withholdingFileNumber" | "status"
>;

export type ScopeOrganization = {
  id: string;
  name: string;
  type: number;
  status: number;
  hasOrganizationScope: boolean;
  canManageOrganization: boolean;
  employers: ScopeEmployer[];
};

export type GlobalScopeContext = {
  organizations: ScopeOrganization[];
  organizationCount: number;
  employerCount: number;
};
