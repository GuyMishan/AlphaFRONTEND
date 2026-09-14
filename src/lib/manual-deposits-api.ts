import { getSession } from "./session";
import type { ManualProductInput, ManualReportEmployeeDetail } from "./types";

export type ManualDepositRow = {
  id: string;
  reportEmployeeId: string;
  employmentId: string;
  employeeName: string;
  nationalId: string;
  productType: number;
  policyNumber: string;
  salaryMonth: string;
  salary: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14StartDate: string | null;
  totalDeposit: number;
};

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
  employee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string) =>
    request<ManualReportEmployeeDetail>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`),
  saveEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string, products: ManualProductInput[]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`, {
      method: "PUT",
      body: JSON.stringify({ products }),
    }),
};
