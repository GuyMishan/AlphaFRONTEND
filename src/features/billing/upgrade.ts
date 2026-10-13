import { createStore } from "zustand/vanilla";
import { problemCode, type ProblemDetails } from "@/lib/api/errors";

export type UpgradeReason = "employers" | "active_employees" | "users" | "feature";

export type UpgradeDialogDetail = {
  reason: UpgradeReason;
  planName?: string;
  current?: number;
  maximum?: number;
  feature?: string;
};

/** Shared UI state for the single plan-upgrade dialog rendered by the app shell. */
export const upgradeDialogStore = createStore<{ detail: UpgradeDialogDetail | null }>()(() => ({ detail: null }));

export function openUpgradeDialog(detail: UpgradeDialogDetail) {
  upgradeDialogStore.setState({ detail });
}

export function closeUpgradeDialog() {
  upgradeDialogStore.setState({ detail: null });
}

// Backend `limit` values (EntitlementService) → dialog reasons.
const limitReasons: Partial<Record<string, UpgradeReason>> = { employers: "employers", employees: "active_employees", users: "users" };

/** Maps backend plan-gate problems (PLAN_LIMIT_REACHED / FEATURE_NOT_AVAILABLE) to dialog content. */
export function upgradeDetailFromProblem(problem?: ProblemDetails): UpgradeDialogDetail | null {
  if (!problem) return null;
  const code = problemCode(problem);
  if (code === "PLAN_LIMIT_REACHED") {
    const reason = limitReasons[problem.limit ?? ""] ?? null;
    return reason ? { reason, current: problem.current, maximum: problem.maximum } : null;
  }
  if (code === "FEATURE_NOT_AVAILABLE") {
    return { reason: "feature", feature: problem.feature };
  }
  return null;
}
