import { apiRequest as request } from "@/lib/api/client";
import type { ManualReportDraft, ManualReportKind, SourceManualReport } from "@/features/reporting/types";
import type { PagedResult } from "@/lib/api/paging";


export type CorrectionRoutePreview = {
  id: string;
  title: string;
  description: string;
  requiresNegative: boolean;
  requiresCurrent: boolean;
  pendingChanges: number;
  negativeProducts: number;
  currentProducts: number;
};

export const derivedReportsApi = {
  correctionRoutes: (organizationId: string, employerId: string, workspaceId: string) =>
    request<{ routes: CorrectionRoutePreview[]; canComplete: boolean }>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${workspaceId}/correction-routes`),
  sourceReports: (organizationId: string, employerId: string, search = "", skip = 0, take = 30) => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    return request<PagedResult<SourceManualReport>>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/source-reports?${params}`);
  },
  create: (organizationId: string, employerId: string, payload: { sourceReportId: string; reportKind: ManualReportKind; reportingMonth: string; salaryPaymentDate: string | null; paymentAccountId?: string; correctionOperationCode?: 2 | 3; reportProductIds?: string[] }) =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/derived`, {
      method: "POST",
      body: payload,
    }),
  ensureCorrectionWorkspace: (organizationId: string, employerId: string, reportId: string, sourceReportProductId?: string) =>
    request<{ reportId: string; reportProductId: string | null; created: boolean; pendingChanges: number }>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/correction-workspace`,
      { method: "POST", body: { sourceReportProductId: sourceReportProductId || null } },
    ),
  materializeCorrection: (organizationId: string, employerId: string, workspaceId: string) =>
    request<{ workspaceId: string; sourceReportId: string; negativeReportId: string | null; currentReportId: string | null; pendingChanges: number; revisionNumber: number }>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${workspaceId}/materialize-correction`,
      { method: "POST" },
    ),
  metadata: (organizationId: string, employerId: string, reportId: string) =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/metadata`),
};
