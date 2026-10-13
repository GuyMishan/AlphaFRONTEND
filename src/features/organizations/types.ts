import type { EmployerAccessMode, OrganizationRole } from "@/features/access/types";
import type { BillingPaymentMethodStatus } from "@/features/billing/types";
import type { EmployerBillingMode, EmployerBillingStatus } from "@/features/employers/types";

export type Organization = {
  id: string;
  name: string;
  type: number;
  status: number;
  createdAt?: string;
  updatedAt?: string;
};

export type OrganizationCapabilities = {
  canManageOrganization: boolean;
  canCreateEmployer: boolean;
};

export type OrganizationBillingStatus = 1 | 2 | 3 | 4;

export type OrganizationProfileCenter = {
  id: string;
  name: string;
  type: number;
  status: number;
  canManageOrganization: boolean;
  canEditOrganizationGeneral: boolean;
  general: {
    registrationNumber: string;
    city: string;
    street: string;
    houseNumber: string;
    apartment: string;
    postalCode: string;
    postOfficeBox: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  billing: {
    status: OrganizationBillingStatus;
    invoiceName: string;
    invoiceRegistrationNumber: string;
    invoiceEmail: string;
    billingContactName: string;
    billingContactPhone: string;
  };
};

export type OrganizationMemberSummary = {
  userId: string;
  displayName: string;
  email: string;
  role: OrganizationRole;
  employerAccessMode: EmployerAccessMode;
};

export type OrganizationEmployerBilling = {
  employerId: string;
  employerName: string;
  billingMode: EmployerBillingMode;
  billingStatus: EmployerBillingStatus;
  billingModeOverridden: boolean;
  billedThroughName: string;
  billingSource: "Organization" | "Employer";
  effectiveBillingConfigured: boolean;
  effectivePaymentMethodStatus: BillingPaymentMethodStatus | null;
};
