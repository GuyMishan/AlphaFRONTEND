"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { feedbackKeys, useEmployerFeedbackContext, useReportFeedbackList, useTreatmentStatuses } from "@/features/feedback/queries";
import type { ReportFeedbackFilters, ReportFeedbackSummary } from "@/features/feedback/api";
import { useReferenceOptions } from "@/features/reference-data/queries";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { errorMessage } from "@/lib/api/error-messages";
import type { EmployerSelection } from "@/lib/session/app-store";
import { columnOptions, type ColumnKey, type ExtraFilterKey } from "../components/reports/reports-view-model";

const REPORTS_PAGE_SIZE = 100;
const EMPTY_SUMMARY: ReportFeedbackSummary = { total: 0, completed: 0, attention: 0, pending: 0 };

/** Server list and user-controlled filters/column preferences. */
export function useReportsView(scope: EmployerSelection) {

  const [filters, setFilters] = useState<ReportFeedbackFilters>({ status: "all" });
  const [extraFilters, setExtraFilters] = useState<ExtraFilterKey[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => columnOptions.filter(item => item.defaultVisible).map(item => item.key));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("alpha:reports:columns");
      if (!stored) return;
      const parsed = JSON.parse(stored) as ColumnKey[];
      const allowed = new Set(columnOptions.map((item) => item.key));
      const next = parsed.filter((item) => allowed.has(item));
      if (next.includes("actions") && next.length > 1) setVisibleColumns(next);
    } catch { /* keep defaults */ }
  }, []);

  function persistColumns(next: ColumnKey[]) {
    const normalized = Array.from(new Set([...next.filter((item) => item !== "actions"), "actions"])) as ColumnKey[];
    setVisibleColumns(normalized);
    try { window.localStorage.setItem("alpha:reports:columns", JSON.stringify(normalized)); } catch { /* ignore */ }
  }

  // The reports grid is server state: one query per (employer, filters); search is debounced.
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 300);
  const listFilters = useMemo(() => ({ ...filters, search: debouncedSearch || undefined }), [filters, debouncedSearch]);
  const listQuery = useReportFeedbackList(scope?.organizationId ?? "", scope?.employerId ?? "", listFilters, REPORTS_PAGE_SIZE);
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (listQuery.data?.pages ?? []).flatMap((page) => page.items).filter((row) => !seen.has(row.id) && Boolean(seen.add(row.id)));
  }, [listQuery.data]);
  const summary: ReportFeedbackSummary = listQuery.data?.pages.at(-1)?.summary ?? EMPTY_SUMMARY;
  const hasMoreReports = Boolean(listQuery.hasNextPage);
  const loading = listQuery.isFetching && !listQuery.isFetchingNextPage;
  const loadingMoreReports = listQuery.isFetchingNextPage;
  const employerIssueCount = useEmployerFeedbackContext(scope?.organizationId ?? "", scope?.employerId ?? "").data?.issues.length ?? 0;
  const treatmentStatuses = useTreatmentStatuses(scope?.organizationId ?? "", scope?.employerId ?? "").data ?? [];
  const reportKindOptions = useReferenceOptions("manual-report-kind", "all", Boolean(scope.organizationId && scope.employerId)).data ?? [];
  const listError = listQuery.error ? errorMessage(listQuery.error, "טעינת הדיווחים נכשלה") : "";

  /** Reloads the grid (and the employer issues) after actions that change reports. */
  async function load() {
    if (!scope) return;
    await queryClient.invalidateQueries({ queryKey: feedbackKeys.employer(scope.organizationId, scope.employerId) });
  }

  async function loadMoreReports() {
    if (!scope || !hasMoreReports || loading || loadingMoreReports) return;
    await listQuery.fetchNextPage();
  }

  function addFilter(key: ExtraFilterKey) {
    setExtraFilters((current) => current.includes(key) ? current : [...current, key]);
  }

  function removeFilter(key: ExtraFilterKey) {
    setExtraFilters((current) => current.filter((item) => item !== key));
    if (key === "kind") setFilters((current) => ({ ...current, reportKind: "" }));
    if (key === "product") setFilters((current) => ({ ...current, product: "" }));
    if (key === "treatment") setFilters((current) => ({ ...current, treatmentStatus: "" }));
    if (key === "attention") setFilters((current) => ({ ...current, requiresAttention: false }));
  }

  return {
    filters, setFilters, extraFilters, addFilter, removeFilter,
    visibleColumns, persistColumns, rows, summary, hasMoreReports,
    loading, loadingMoreReports, employerIssueCount, treatmentStatuses,
    reportKindOptions, listError, load, loadMoreReports,
  };
}
