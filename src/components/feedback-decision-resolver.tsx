"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, FilePenLine, Link2, Scale, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { UiSelect, UiTextarea } from "@/components/ui-controls";
import {
  reportFeedbackApi,
  type FeedbackResolutionGroup,
  type FeedbackResolutionProblem,
} from "@/lib/report-feedback-api";

type DecisionOutcome = "confirm" | "correction" | "external" | "reconcile" | "link-original";

function latestDecisionLabel(value: string | null) {
  switch (value) {
    case "confirm": return "אושר כתקין";
    case "correction": return "נבחר תיקון בדיווח";
    case "external": return "הועבר לטיפול חיצוני";
    case "reconcile": return "הועבר להתאמת כספים";
    case "link-original": return "נדרש קישור לתנועה מקורית";
    default: return "";
  }
}

function confirmLabel(problem: FeedbackResolutionProblem) {
  return problem.resolverType === "split"
    ? "אישור הפיצול כפי שנקלט"
    : "אישור המצב כפי שנקלט";
}

export function FeedbackDecisionResolver({
  organizationId,
  employerId,
  group,
  onChanged,
  onEditDeposit,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  onChanged: () => void;
  onEditDeposit?: (problemIds: string[]) => void;
}) {
  const router = useRouter();
  const [busyProblemId, setBusyProblemId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [movementCandidates, setMovementCandidates] = useState<Record<string, Awaited<ReturnType<typeof reportFeedbackApi.originalMovementCandidates>>["items"]>>({});
  const [selectedMovement, setSelectedMovement] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const decisionProblems = group.problems.filter(problem => problem.resolutionType === "decision");
  if (!decisionProblems.length) return null;

  async function decide(problem: FeedbackResolutionProblem, outcome: DecisionOutcome) {
    const note = notes[problem.problemId]?.trim() ?? "";
    if (["external", "reconcile", "link-original"].includes(outcome) && !note) {
      setError("יש לכתוב הערה קצרה שמסבירה את ההחלטה לפני העברת הטיפול.");
      return;
    }

    setBusyProblemId(problem.problemId);
    setError("");
    try {
      const result = await reportFeedbackApi.decideProblem(
        organizationId,
        employerId,
        problem.reportId,
        problem.problemId,
        outcome,
        note,
      );

      if (outcome === "correction" && result.workspaceReportId) {
        const product = result.workspaceReportProductId
          ? `&focusReportProductId=${encodeURIComponent(result.workspaceReportProductId)}`
          : "";
        const employee = result.workspaceReportEmployeeId
          ? `&focusReportEmployeeId=${encodeURIComponent(result.workspaceReportEmployeeId)}`
          : "";
        const resolver = `&resolutionResolver=${encodeURIComponent(problem.resolverType)}`;
        const source = `&resolutionSourceReportId=${encodeURIComponent(problem.reportId)}`;
        const ids = `&resolutionProblemIds=${encodeURIComponent(problem.problemId)}`;
        router.push(
          `/reports/new?resumeReportId=${result.workspaceReportId}&correctionWorkspace=1${product}${employee}${resolver}${source}${ids}`,
        );
        return;
      }

      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת ההחלטה נכשלה.");
    } finally {
      setBusyProblemId("");
    }
  }

  return <section className="feedback-decision-resolver" aria-label="בדיקה והחלטה">
    <div className="feedback-resolution-section-head">
      <div>
        <h3>בדיקה והחלטה</h3>
        <p>כל שגיאה נבחנת ונשמרת בנפרד. מוצגות רק החלטות שה־Backend מאשר לקוד הספציפי.</p>
      </div>
    </div>

    {error ? <div className="notice notice-error">{error}</div> : null}

    <div className="feedback-decision-list">
      {decisionProblems.map(problem => {
        const actions = new Set(problem.availableActions);
        const requiresNote = actions.has("openExternalCase") || actions.has("reconcile");
        const latest = latestDecisionLabel(problem.latestDecision);
        const busy = busyProblemId === problem.problemId;

        return <article className="feedback-decision-card" key={problem.problemId}>
          <div className="feedback-decision-card-head">
            <div>
              <strong>קוד {problem.code}</strong>
              <span>{problem.description}</span>
            </div>
            {latest ? <span className="feedback-decision-status">{latest}</span> : null}
          </div>

          {problem.latestDecisionNote ? <div className="feedback-decision-last-note">
            <small>הערה אחרונה</small>
            <span>{problem.latestDecisionNote}</span>
          </div> : null}

          {requiresNote ? <label className="feedback-decision-note">
            <span>הערת טיפול</span>
            <UiTextarea
              rows={3}
              maxLength={4000}
              value={notes[problem.problemId] ?? ""}
              disabled={busy}
              placeholder="לדוגמה: נבדקו נתוני המעסיק והמשוב, נדרש בירור מול הגוף המוסדי..."
              onChange={(event) => setNotes(current => ({
                ...current,
                [problem.problemId]: event.target.value,
              }))}
            />
          </label> : null}

          <div className="feedback-decision-actions">
            {actions.has("confirm") ? <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !group.canExecute}
              onClick={() => void decide(problem, "confirm")}
            >
              <CheckCircle2 size={16} />{confirmLabel(problem)}
            </button> : null}

            {actions.has("prepareCorrection") ? <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !group.canExecute}
              onClick={() => void decide(problem, "correction")}
            >
              <FilePenLine size={16} />תיקון בדיווח<ArrowLeft size={15} />
            </button> : null}

            {actions.has("editPayment") && onEditDeposit ? <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !group.canExecute}
              onClick={() => onEditDeposit([])}
            >
              <WalletCards size={16} />בדיקת פרטי תשלום
            </button> : null}

            {actions.has("openExternalCase") ? <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !group.canExecute}
              onClick={() => void (async () => {
                const note = notes[problem.problemId]?.trim() ?? "";
                if (!note) {
                  setError("יש לכתוב הערה קצרה לפני פתיחת תיק טיפול חיצוני.");
                  return;
                }
                setBusyProblemId(problem.problemId);
                setError("");
                try {
                  await reportFeedbackApi.openExternalCase(
                    organizationId,
                    employerId,
                    problem.reportId,
                    group.groupKey,
                    [problem.problemId],
                    note,
                  );
                  onChanged();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "פתיחת תיק הטיפול נכשלה.");
                } finally {
                  setBusyProblemId("");
                }
              })()}
            >
              <ExternalLink size={16} />העברה לטיפול חיצוני
            </button> : null}

            {actions.has("reconcile") ? <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !group.canExecute}
              onClick={() => void (async () => {
                const note = notes[problem.problemId]?.trim() ?? "";
                if (!note) {
                  setError("יש לכתוב הערה קצרה לפני פתיחת תיק התאמת כספים.");
                  return;
                }
                setBusyProblemId(problem.problemId);
                setError("");
                try {
                  await reportFeedbackApi.openExternalCase(
                    organizationId,
                    employerId,
                    problem.reportId,
                    group.groupKey,
                    [problem.problemId],
                    note,
                    "reconcile",
                  );
                  onChanged();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "פתיחת תיק התאמת הכספים נכשלה.");
                } finally {
                  setBusyProblemId("");
                }
              })()}
            >
              <Scale size={16} />העברה להתאמת כספים
            </button> : null}

            {actions.has("linkOriginalRecord") ? <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !group.canExecute}
                onClick={() => void (async () => {
                  setBusyProblemId(problem.problemId);
                  setError("");
                  try {
                    const result = await reportFeedbackApi.originalMovementCandidates(
                      organizationId,
                      employerId,
                      problem.reportId,
                      problem.problemId,
                    );
                    setMovementCandidates((current) => ({ ...current, [problem.problemId]: result.items }));
                    if (result.items.length === 1) {
                      setSelectedMovement((current) => ({
                        ...current,
                        [problem.problemId]: result.items[0].contributionId,
                      }));
                    }
                    if (!result.items.length) setError("לא נמצאה תנועה קודמת מתאימה. ניתן להעביר את הבעיה לטיפול חיצוני אם הפעולה זמינה.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "איתור התנועות הקודמות נכשל.");
                  } finally {
                    setBusyProblemId("");
                  }
                })()}
              >
                <Link2 size={16} />איתור תנועה מקורית
              </button>
              {movementCandidates[problem.problemId] ? <div className="feedback-original-movement-picker">
                <UiSelect
                  aria-label="בחירת תנועה מקורית"
                  value={selectedMovement[problem.problemId] ?? ""}
                  disabled={busy || !movementCandidates[problem.problemId].length}
                  onChange={(event) => setSelectedMovement((current) => ({
                    ...current,
                    [problem.problemId]: event.target.value,
                  }))}
                >
                  <option value="">בחירת תנועה קודמת</option>
                  {movementCandidates[problem.problemId].map((candidate) => <option
                    key={candidate.contributionId}
                    value={candidate.contributionId}
                  >
                    {candidate.reportingMonth.slice(0, 7)} · {candidate.productName || candidate.policyNumber || "מוצר"} · {candidate.amount.toLocaleString("he-IL")} ₪
                  </option>)}
                </UiSelect>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !selectedMovement[problem.problemId]}
                  onClick={() => void (async () => {
                    const contributionId = selectedMovement[problem.problemId];
                    if (!contributionId) return;
                    setBusyProblemId(problem.problemId);
                    setError("");
                    try {
                      await reportFeedbackApi.linkOriginalMovement(
                        organizationId,
                        employerId,
                        problem.reportId,
                        problem.problemId,
                        contributionId,
                      );
                      onChanged();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "קישור התנועה המקורית נכשל.");
                    } finally {
                      setBusyProblemId("");
                    }
                  })()}
                >
                  קישור ושמירה
                </button>
              </div> : null}
            </> : null}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
