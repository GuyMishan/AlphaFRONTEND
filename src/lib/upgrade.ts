import type { ApiProblem } from "./types";

export type UpgradeReason = "employers" | "active_employees" | "users" | "feature";

export type UpgradeDialogDetail = {
  reason: UpgradeReason;
  planName?: string;
  current?: number;
  maximum?: number;
  feature?: string;
};

export const UPGRADE_DIALOG_EVENT = "alpha:upgrade-dialog";

export function openUpgradeDialog(detail: UpgradeDialogDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradeDialogDetail>(UPGRADE_DIALOG_EVENT, { detail }));
}

export function upgradeDetailFromProblem(problem?: ApiProblem): UpgradeDialogDetail | null {
  if (!problem) return null;
  if (problem.error === "plan_limit_reached") {
    const reason = problem.limit === "employers" || problem.limit === "active_employees" || problem.limit === "users"
      ? problem.limit
      : null;
    return reason ? { reason, current: problem.current, maximum: problem.maximum } : null;
  }
  if (problem.error === "feature_not_available") {
    return { reason: "feature", feature: problem.feature };
  }
  return null;
}
