import { apiRequest, queryString } from "@/lib/api/client";
import type { EmployeeInput } from "@/features/employees/types";
import type { ManualProductInput } from "@/features/pension/types";
import type { ManualReportDraft, ResumableManualReport, ManualReportEmployeeDetail, ManualReportEmployeeSummary } from "@/features/reporting/types";
import type { PagedResult } from "@/lib/api/paging";

export const manualReportsApi = {
  createManualReport: (organizationId: string, employerId: string, payload: { reportingMonth: string; salaryPaymentDate: string | null; employmentIds: string[]; paymentAccountId?: string }): Promise<ManualReportDraft> =>
    apiRequest<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports`, { method: "POST", body: payload }),
  openManualReports: (organizationId: string, employerId: string, skip = 0, take = 20): Promise<PagedResult<ResumableManualReport>> =>
    apiRequest<PagedResult<ResumableManualReport>>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports${queryString({ skip, take })}`),
  manualReport: (organizationId: string, employerId: string, reportId: string): Promise<ManualReportDraft> =>
    apiRequest<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}`),
  deleteManualReport: (organizationId: string, employerId: string, reportId: string) =>
    apiRequest<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}`, { method: "DELETE" }),
  updateManualReportPaymentAccount: (organizationId: string, employerId: string, reportId: string, paymentAccountId: string) =>
    apiRequest<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/payment-account`, { method: "PUT", body: { paymentAccountId } }),
  syncManualReportEmployees: (organizationId: string, employerId: string, reportId: string, employmentIds: string[]) =>
    apiRequest<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/selection`, { method: "PUT", body: { employmentIds } }),
  manualReportEmployees: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 100): Promise<PagedResult<ManualReportEmployeeSummary>> =>
    apiRequest<PagedResult<ManualReportEmployeeSummary>>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees${queryString({ search, skip, take })}`),
  manualReportEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string): Promise<ManualReportEmployeeDetail> =>
    apiRequest<ManualReportEmployeeDetail>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`),
  saveManualReportEmployee: (
    organizationId: string,
    employerId: string,
    reportId: string,
    reportEmployeeId: string,
    monthlySalary: number,
    products: ManualProductInput[],
    snapshot?: EmployeeInput,
  ) =>
    apiRequest<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`, {
      method: "PUT",
      body: {
        monthlySalary,
        products,
        snapshot: snapshot ? {
          identifierType: snapshot.identifierType ?? 1,
          identifier: snapshot.nationalId,
          birthDate: snapshot.birthDate,
          gender: snapshot.gender,
          email: snapshot.email,
          mobile: snapshot.mobile,
          city: snapshot.city,
          street: snapshot.street,
          houseNumber: snapshot.houseNumber,
          apartment: snapshot.apartment,
          postalCode: snapshot.postalCode,
          postOfficeBox: snapshot.postOfficeBox,
          employmentStartDate: snapshot.startDate,
        } : null,
      },
    }),
};
