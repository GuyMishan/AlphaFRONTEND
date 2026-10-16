"use client";

import { useEffect, useState } from "react";
import type { EmployerSelection } from "@/lib/session/app-store";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { errorMessage } from "@/lib/api/error-messages";
import { derivedReportsApi } from "../derived-reports-api";
import type { SourceManualReport } from "../types";
import type { PatchReportWizard, ReportEntry } from "./model";

/** Source search/paging remains independent of the draft being edited. */
export function useReportSources(scope: EmployerSelection, entry: ReportEntry, selectionKey: string | null, patch: PatchReportWizard) {
  const [items, setItems] = useState<SourceManualReport[]>([]);
  const [search, setSearch] = useState(entry.sourceMonth);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const requests = useLatestRequest();

  function choose(report: SourceManualReport) {
    patch({
      sourceReportId: report.id,
      month: report.reportingMonth.slice(0, 7),
      salaryPaymentDate: report.salaryPaymentDate?.slice(0, 10) ?? "",
      error: "",
      sentExternalId: "",
    });
  }

  async function load(reset = true, value = search) {
    const isCurrent = requests.begin();
    setLoading(true);
    try {
      const first = await derivedReportsApi.sourceReports(scope.organizationId, scope.employerId, value.trim(), reset ? 0 : items.length, 30);
      if (!isCurrent()) return;
      let nextItems = first.items;
      let more = first.hasMore;
      // Deep links identify an exact report; continue paging until it is found.
      let skip = first.items.length;
      while (reset && entry.sourceReportId && more && !nextItems.some(item => item.id === entry.sourceReportId)) {
        const page = await derivedReportsApi.sourceReports(scope.organizationId, scope.employerId, value.trim(), skip, 100);
        if (!isCurrent()) return;
        nextItems = [...nextItems, ...page.items.filter(item => !nextItems.some(existing => existing.id === item.id))];
        more = page.hasMore;
        skip += page.items.length;
        if (!page.items.length) break;
      }
      setItems(current => reset ? nextItems : [...current, ...nextItems.filter(item => !current.some(existing => existing.id === item.id))]);
      setHasMore(more);
      if (reset) {
        const requested = nextItems.find(item => item.id === entry.sourceReportId);
        if (requested) choose(requested);
        else patch({ sourceReportId: "" });
      }
    } catch (error) {
      if (isCurrent()) patch({ error: errorMessage(error, "טעינת הדיווחים הקודמים נכשלה") });
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectionKey) return;
    const initialSearch = entry.sourceReportId ? entry.sourceMonth : "";
    setSearch(initialSearch);
    void load(true, initialSearch);
    return requests.cancel;
    // Reload on entry into source selection; typing only loads on explicit search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const eligible = items.filter(report => report.canBeCurrentCorrectionSource
    || Boolean(entry.sourceProductId && report.id === entry.sourceReportId));
  return { items, eligible, search, setSearch, hasMore, loading, choose, load };
}
