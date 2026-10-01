import { backendFetch } from "./backend-fetch";

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
  fundClassification: string;
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
  trustAccountValueDate: string | null;
  actualDepositAmount: number | null;
  isCorrectionWorkspace?: boolean;
  sourceReportProductId?: string | null;
  correctionOperationCode?: 2 | 3 | null;
  masavSenderCode: string;
  referenceNumber: string;
  employerBankName: string;
  employerBankCode: string;
  employerBranch: string;
  employerAccount: string;
  confirmationFileName: string;
  requiresCompletion?: boolean;
};

export type ManualPaymentInput = Pick<ManualDepositRow,
  "providerName" | "providerAccount" | "paymentMethod" | "valueDate" | "trustAccountValueDate" | "actualDepositAmount" | "masavSenderCode" | "referenceNumber" |
  "employerBankName" | "employerBankCode" | "employerBranch" | "employerAccount" | "confirmationFileName"> & {
    correctionOperationCode?: 2 | 3 | null;
  };

export type DepositPage = { items: ManualDepositRow[]; hasMore: boolean };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await backendFetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`אירעה שגיאה (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const manualDepositsApi = {
  list: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 50, reportProductId = "") => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    if (reportProductId) params.set("reportProductId", reportProductId);
    return request<DepositPage>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/deposits?${params}`);
  },
  savePayment: (organizationId: string, employerId: string, reportId: string, reportProductId: string, payload: ManualPaymentInput) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/deposits/${reportProductId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
