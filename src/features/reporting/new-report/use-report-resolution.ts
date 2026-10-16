"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { reportFeedbackApi } from "@/features/feedback/api";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { ReportEntry } from "./model";

/** Feedback links may come from the URL or from the persisted correction workspace. */
export function useReportResolution(scope: EmployerSelection, entry: ReportEntry, reportId: string) {
  const [problemIds, setProblemIds] = useState(entry.problemIds);
  const [sourceReportId, setSourceReportId] = useState(entry.resolutionSourceReportId);
  const [resolver, setResolver] = useState(entry.resolver);

  useEffect(() => {
    if (!reportId || !entry.correctionWorkspace || problemIds.length) return;
    let active = true;
    reportFeedbackApi.correctionWorkspaceResolutionLinks(scope.organizationId, scope.employerId, reportId)
      .then(result => {
        if (!active || !result.problemIds.length) return;
        setSourceReportId(result.sourceReportId ?? "");
        setProblemIds(result.problemIds);
        if (!resolver && result.resolverTypes.length === 1) setResolver(result.resolverTypes[0]);
      }).catch(() => {
        // Ordinary corrections do not necessarily have feedback links.
      });
    return () => { active = false; };
  }, [scope.organizationId, scope.employerId, reportId, entry.correctionWorkspace, problemIds.length, resolver]);

  async function resolveAfterValidation() {
    if (!entry.correctionWorkspace || !sourceReportId || !problemIds.length) return;
    await reportFeedbackApi.resolveProblems(
      scope.organizationId, scope.employerId, sourceReportId, problemIds, "workspace-validation", reportId,
    );
    setProblemIds([]);
    toast.success("התיקונים עברו ולידציה. השגיאות יישארו פתוחות עד להשלמת הדיווח החוזר.");
  }

  return { resolver, resolveAfterValidation };
}
