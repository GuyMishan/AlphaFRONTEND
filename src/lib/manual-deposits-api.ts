import { getSession } from "./session";

export type ManualDepositRow = {
  id: string;
  reportEmployeeId: string;
  employmentId: string;
  employeeName: string;
  nationalId: string;
  productType: number;
  policyNumber: string;
  fundExternalKey: string;
  fundCode: string;
  fundName: string;
  fundCompanyName: string;
  salaryMonth: string;
  salary: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14StartDate: string | null;
  totalDeposit: number;
  providerName: string;
  providerAccount: string;
  paymentMethod: string;
  valueDate: string | null;
  referenceNumber: string;
  employerBankName: string;
  employerBankCode: string;
  employerBranch: string;
  employerAccount: string;
  confirmationFileName: string;
};

export type ManualPaymentInput = Pick<ManualDepositRow,
  "providerName" | "providerAccount" | "paymentMethod" | "valueDate" | "referenceNumber" |
  "employerBankName" | "employerBankCode" | "employerBranch" | "employerAccount" | "confirmationFileName">;

export type DepositPage = { items: ManualDepositRow[]; hasMore: boolean };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`שגיאת שרת (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const manualDepositsApi = {
  list: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 50) => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    return request<DepositPage>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/deposits?${params}`);
  },
  savePayment: (organizationId: string, employerId: string, reportId: string, reportProductId: string, payload: ManualPaymentInput) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/deposits/${reportProductId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
