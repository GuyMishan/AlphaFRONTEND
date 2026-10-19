import { apiRequest } from "@/lib/api/client";
import type {
  AlphaBillingAccount,
  AlphaBillingAccountInput,
  BillingAccountPricingType,
  BillingCustomerRow,
  BillingGateStatus,
  EmployerBillingResolution,
  EntitlementSnapshot,
  PaymentMethodSetupResult,
  PaymentMethodSyncResult,
  SelfServiceBillingPricing,
} from "@/features/billing/types";

const organizationPath = (organizationId: string) => `/api/organizations/${organizationId}`;
const employerPath = (organizationId: string, employerId: string) => `${organizationPath(organizationId)}/employers/${employerId}`;

/**
 * Alpha subscription billing (plans, entitlements, the billing account that pays Alpha).
 * Organization- and employer-level variants hit the same backend shape at different scopes.
 */
export const billingApi = {
  entitlements: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<EntitlementSnapshot>(`${organizationPath(organizationId)}/entitlements`, { signal }),
  billingCustomers: (signal?: AbortSignal) =>
    apiRequest<BillingCustomerRow[]>("/api/platform/billing/customers", { signal }),

  organizationSelfServicePricing: (organizationId: string) =>
    apiRequest<SelfServiceBillingPricing>(`${organizationPath(organizationId)}/billing/pricing`),
  updateOrganizationSelfServicePricing: (organizationId: string, billingType: BillingAccountPricingType) =>
    apiRequest<SelfServiceBillingPricing>(`${organizationPath(organizationId)}/billing/pricing`, { method: "PUT", body: { billingType } }),
  employerSelfServicePricing: (organizationId: string, employerId: string) =>
    apiRequest<SelfServiceBillingPricing>(`${employerPath(organizationId, employerId)}/billing/pricing`),
  updateEmployerSelfServicePricing: (organizationId: string, employerId: string, billingType: BillingAccountPricingType) =>
    apiRequest<SelfServiceBillingPricing>(`${employerPath(organizationId, employerId)}/billing/pricing`, { method: "PUT", body: { billingType } }),

  organizationBillingAccount: (organizationId: string) =>
    apiRequest<AlphaBillingAccount>(`${organizationPath(organizationId)}/billing-account`),
  saveOrganizationBillingAccount: (organizationId: string, payload: AlphaBillingAccountInput) =>
    apiRequest<AlphaBillingAccount>(`${organizationPath(organizationId)}/billing-account`, { method: "PUT", body: payload }),
  startOrganizationPaymentSetup: (organizationId: string, returnPath: string, details?: AlphaBillingAccountInput) =>
    apiRequest<PaymentMethodSetupResult>(`${organizationPath(organizationId)}/billing-account/provider/setup`, { method: "POST", body: { returnPath, ...details } }),
  syncOrganizationPaymentMethod: (organizationId: string) =>
    apiRequest<PaymentMethodSyncResult>(`${organizationPath(organizationId)}/billing-account/provider/sync`, { method: "POST" }),
  cancelOrganizationPaymentMethod: (organizationId: string) =>
    apiRequest<void>(`${organizationPath(organizationId)}/billing-account/provider/cancel`, { method: "POST" }),

  employerBillingAccount: (organizationId: string, employerId: string) =>
    apiRequest<AlphaBillingAccount>(`${employerPath(organizationId, employerId)}/billing-account`),
  employerBillingResolution: (organizationId: string, employerId: string) =>
    apiRequest<EmployerBillingResolution>(`${employerPath(organizationId, employerId)}/billing-account/resolution`),
  employerBillingGate: (organizationId: string, employerId: string) =>
    apiRequest<BillingGateStatus>(`${employerPath(organizationId, employerId)}/billing-account/gate`),
  saveEmployerBillingAccount: (organizationId: string, employerId: string, payload: AlphaBillingAccountInput) =>
    apiRequest<AlphaBillingAccount>(`${employerPath(organizationId, employerId)}/billing-account`, { method: "PUT", body: payload }),
  startEmployerPaymentSetup: (organizationId: string, employerId: string, returnPath: string, details?: AlphaBillingAccountInput) =>
    apiRequest<PaymentMethodSetupResult>(`${employerPath(organizationId, employerId)}/billing-account/provider/setup`, { method: "POST", body: { returnPath } }),
  syncEmployerPaymentMethod: (organizationId: string, employerId: string) =>
    apiRequest<PaymentMethodSyncResult>(`${employerPath(organizationId, employerId)}/billing-account/provider/sync`, { method: "POST" }),
  cancelEmployerPaymentMethod: (organizationId: string, employerId: string) =>
    apiRequest<void>(`${employerPath(organizationId, employerId)}/billing-account/provider/cancel`, { method: "POST" }),
};
