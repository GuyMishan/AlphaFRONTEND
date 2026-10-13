import type { EmployerBillingMode } from "@/features/employers/types";

export type EntitlementUsage = {
  current: number;
  maximum: number | null;
};

export type EntitlementSnapshot = {
  plan: { id: string | null; code: string; name: string };
  employers: EntitlementUsage;
  activeEmployees: EntitlementUsage;
  users: EntitlementUsage;
};

export type BillingPaymentMethodType = 1 | 2;

export type BillingPaymentMethodStatus = 1 | 2 | 3 | 4 | 5 | 6;

export type BillingAccountStatus = 1 | 2 | 3 | 4 | 5;

export type BillingMode = 1 | 2;

export type AlphaBillingAccount = {
  id: string | null;
  organizationId: string | null;
  employerId: string | null;
  billingName: string;
  taxId: string;
  invoiceEmail: string;
  billingAddress: string;
  paymentMethodType: BillingPaymentMethodType;
  paymentMethodStatus: BillingPaymentMethodStatus;
  hasProviderPaymentMethod: boolean;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  hasBankDebitMandate: boolean;
  billingMode: BillingMode;
  status: BillingAccountStatus;
  defaultPaymentMethodId: string | null;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AlphaBillingAccountInput = {
  billingName: string;
  taxId: string;
  invoiceEmail: string;
  billingAddress: string;
  paymentMethodType: BillingPaymentMethodType;
};

export type EmployerBillingResolution = {
  employerId: string;
  organizationId: string;
  billingMode: EmployerBillingMode;
  source: "Organization" | "Employer";
  billedThroughName: string;
  effectiveAccount: AlphaBillingAccount;
  organizationAccount: AlphaBillingAccount;
  employerAccount: AlphaBillingAccount;
};

export type BillingGateStatus = {
  canTransmit: boolean;
  error: string | null;
  billingMode: string | null;
  source: "Organization" | "Employer" | null;
  billedThroughName: string | null;
  paymentMethodType: BillingPaymentMethodType | null;
  paymentMethodStatus: BillingPaymentMethodStatus | null;
  configured: boolean;
};

export type PaymentMethodSetupResult = {
  provider: string;
  setupRequestId: string;
  redirectUrl: string;
};

export type PaymentMethodSyncResult = {
  provider: string;
  status: BillingPaymentMethodStatus;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
};

export type BillingAccountPricingType = "Free" | "PerEmployee" | "PerReportRow";

export type SelfServiceBillingPricing = {
  billingType: BillingAccountPricingType;
  unitPrice: number;
  employeeUnitPrice: number;
  rowUnitPrice: number;
  accountValid: boolean;
};

export type BillingCustomerRow = {
  payerType: "Organization" | "Employer";
  entityType: "Organization" | "Employer";
  payerId: string;
  payerName: string;
  organizationId: string;
  organizationName: string;
  employerId: string | null;
  employerName: string | null;
  billingAccountId: string | null;
  billingSource: "Organization" | "Employer";
  billedThroughName: string;
  inherited: boolean;
  paymentMethodStatus: number | string;
  paymentMethodType: number | string;
  cardBrand: string;
  cardLast4: string;
  configured: boolean;
  pensionPaymentConfigured: boolean;
  pensionPaymentSource: "Organization" | "Employer";
  pensionPaymentThroughName: string;
  billingType: BillingAccountPricingType;
  unitPrice: number;
};
