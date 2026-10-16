"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { errorMessage } from "@/lib/api/error-messages";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { PagedResult } from "@/lib/api/paging";
import type { ResumableManualReport } from "../types";
import { manualReportsApi } from "../api";

export function useOpenReportDrafts(scope: EmployerSelection, initial: PagedResult<ResumableManualReport>) {
  const [items, setItems] = useState(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ResumableManualReport | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const requests = useLatestRequest();

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

  return { items, hasMore, loading, selected, setSelected, deletingId, loadMore, removeSelected };
}
