import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { employerKeys } from "@/features/employers/queries";
import { reportFeedbackApi, type ReportFeedbackFilters } from "./api";

/** Reports & feedback for one employer. */
export const feedbackKeys = {
  employer: (organizationId: string, employerId: string) => [...employerKeys.detail(organizationId, employerId), "report-feedback"] as const,
  list: (organizationId: string, employerId: string, filters: ReportFeedbackFilters, pageSize: number) =>
    [...feedbackKeys.employer(organizationId, employerId), "list", { ...filters, pageSize }] as const,
  employerContext: (organizationId: string, employerId: string) => [...feedbackKeys.employer(organizationId, employerId), "employer-context"] as const,
  treatmentStatuses: (organizationId: string, employerId: string) => [...feedbackKeys.employer(organizationId, employerId), "treatment-statuses"] as const,
};

/** The reports grid: filtered, paged by `skip`; the summary describes the whole filtered set. */
export function useReportFeedbackList(organizationId: string, employerId: string, filters: ReportFeedbackFilters, pageSize: number) {
  return useInfiniteQuery({
    queryKey: feedbackKeys.list(organizationId, employerId, filters, pageSize),
    queryFn: ({ pageParam, signal }) => reportFeedbackApi.list(organizationId, employerId, filters, pageParam, pageSize, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.hasMore ? pages.reduce((count, page) => count + page.items.length, 0) : undefined,
    enabled: Boolean(organizationId && employerId),
  });
}

/** Employer-scope feedback issues (drives the "שגיאות מעסיק" entry point). */
export function useEmployerFeedbackContext(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: feedbackKeys.employerContext(organizationId, employerId),
    queryFn: ({ signal }) => reportFeedbackApi.employerContext(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}

export function useTreatmentStatuses(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: feedbackKeys.treatmentStatuses(organizationId, employerId),
    queryFn: () => reportFeedbackApi.treatmentStatuses(organizationId, employerId),
    enabled: Boolean(organizationId && employerId),
    staleTime: Infinity,
  });
}
