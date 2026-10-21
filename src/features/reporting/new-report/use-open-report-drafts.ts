"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { errorMessage } from "@/lib/api/error-messages";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { PagedResult } from "@/lib/api/paging";
import type { ResumableManualReport } from "../types";
import { manualReportsApi } from "../api";

export function useOpenReportDrafts(scope: EmployerSelection, initial: PagedResult<ResumableManualReport>, active: boolean) {
  const [items, setItems] = useState(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selected, setSelected] = useState<ResumableManualReport | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const requests = useLatestRequest();

  // Refresh on every entry, so drafts created after initial wizard setup are not hidden.
  useEffect(() => {
    if (!active) return;
    const isCurrent = requests.begin();
    setLoading(true);
    void manualReportsApi.openManualReports(scope.organizationId, scope.employerId).then(page => {
      if (!isCurrent()) return;
      setItems(page.items);
      setHasMore(page.hasMore);
    }).catch(error => {
      if (isCurrent()) toast.error(errorMessage(error, "טעינת הטיוטות נכשלה"));
    }).finally(() => { if (isCurrent()) setLoading(false); });
    return requests.cancel;
  }, [active, scope.organizationId, scope.employerId, requests]);

  async function loadMore() {
    if (loading || !hasMore) return;
    const isCurrent = requests.begin();
    setLoading(true);
    try {
      const page = await manualReportsApi.openManualReports(scope.organizationId, scope.employerId, items.length);
      if (!isCurrent()) return;
      setItems(current => [...current, ...page.items.filter(item => !current.some(existing => existing.id === item.id))]);
      setHasMore(page.hasMore);
    } catch (error) {
      if (isCurrent()) toast.error(errorMessage(error, "טעינת הטיוטות נכשלה"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function searchDrafts() {
    const query = search.trim();
    setActiveSearch(query);
    if (!query || !hasMore || loading) return;
    const isCurrent = requests.begin();
    setLoading(true);
    try {
      let next = [...items];
      let more: boolean = hasMore;
      while (more && isCurrent()) {
        const page = await manualReportsApi.openManualReports(scope.organizationId, scope.employerId, next.length);
        if (!isCurrent()) return;
        const additions = page.items.filter(item => !next.some(existing => existing.id === item.id));
        next = [...next, ...additions];
        more = page.hasMore && additions.length > 0;
      }
      if (isCurrent()) {
        setItems(next);
        setHasMore(more);
      }
    } catch (error) {
      if (isCurrent()) toast.error(errorMessage(error, "חיפוש הטיוטות נכשל"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function removeSelected() {
    if (!selected || deletingId) return;
    setDeletingId(selected.id);
    try {
      await manualReportsApi.deleteManualReport(scope.organizationId, scope.employerId, selected.id);
      setItems(current => current.filter(item => item.id !== selected.id));
      setSelected(null);
      toast.success("הטיוטה נמחקה");
    } catch (error) {
      toast.error(errorMessage(error, "מחיקת הטיוטה נכשלה"));
    } finally {
      setDeletingId("");
    }
  }

  return { items: activeSearch ? items.filter(item => item.reportingMonth.slice(0, 7).includes(activeSearch)) : items,
    hasMore, loading, selected, setSelected, deletingId, loadMore, removeSelected,
    search, setSearch, searchDrafts };
}
