import { apiRequest } from "@/lib/api/client";
import type {
  BankDebitMandate,
  BankDebitMandateStatus,
  EmployerPaymentAccount,
  EmployerPaymentAccountEdit,
  EmployerPaymentAccountInput,
  OrganizationPaymentAccountResponse,
  PensionPaymentResolution,
} from "@/features/payment-accounts/types";

/** Bank-debit mandate update (organization or employer account). */
export type MandateUpdate = {
  status: BankDebitMandateStatus; externalMandateId?: string; approvedAt?: string | null; cancelledAt?: string | null; documentId?: string;
};

const organizationAccount = (organizationId: string) => `/api/organizations/${organizationId}/payment-account`;
const employerAccounts = (organizationId: string, employerId: string) => `/api/organizations/${organizationId}/employers/${employerId}/payment-accounts`;

/** Pension payment accounts: the bank accounts that pay pension deposits (not Alpha billing). */
export const paymentAccountsApi = {
  organizationPaymentAccount: (organizationId: string) =>
    apiRequest<OrganizationPaymentAccountResponse>(organizationAccount(organizationId)),
  organizationPaymentAccountEdit: (organizationId: string, accountId: string) =>
    apiRequest<EmployerPaymentAccountEdit>(`${organizationAccount(organizationId)}/${accountId}/edit`),
  createOrganizationPaymentAccount: (organizationId: string, payload: EmployerPaymentAccountInput) =>
    apiRequest<EmployerPaymentAccount>(organizationAccount(organizationId), { method: "POST", body: payload }),
  updateOrganizationPaymentAccount: (organizationId: string, accountId: string, payload: EmployerPaymentAccountInput) =>
    apiRequest<EmployerPaymentAccount>(`${organizationAccount(organizationId)}/${accountId}`, { method: "PUT", body: payload }),
  updateOrganizationPaymentMandate: (organizationId: string, accountId: string, payload: MandateUpdate) =>
    apiRequest<BankDebitMandate>(`${organizationAccount(organizationId)}/${accountId}/mandate`, { method: "PUT", body: payload }),

  employerPaymentAccounts: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    apiRequest<EmployerPaymentAccount[]>(employerAccounts(organizationId, employerId), { signal }),
  employerPaymentResolution: (organizationId: string, employerId: string) =>
    apiRequest<PensionPaymentResolution>(`${employerAccounts(organizationId, employerId)}/resolution`),
  employerPaymentAccount: (organizationId: string, employerId: string, accountId: string) =>
    apiRequest<EmployerPaymentAccountEdit>(`${employerAccounts(organizationId, employerId)}/${accountId}`),
  createEmployerPaymentAccount: (organizationId: string, employerId: string, payload: EmployerPaymentAccountInput) =>
    apiRequest<EmployerPaymentAccount>(employerAccounts(organizationId, employerId), { method: "POST", body: payload }),
  updateEmployerPaymentAccount: (organizationId: string, employerId: string, accountId: string, payload: EmployerPaymentAccountInput) =>
    apiRequest<EmployerPaymentAccount>(`${employerAccounts(organizationId, employerId)}/${accountId}`, { method: "PUT", body: payload }),
  updateEmployerPaymentMandate: (organizationId: string, employerId: string, accountId: string, payload: MandateUpdate) =>
    apiRequest<BankDebitMandate>(`${employerAccounts(organizationId, employerId)}/${accountId}/mandate`, { method: "PUT", body: payload }),
};
