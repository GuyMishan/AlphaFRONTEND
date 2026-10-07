"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, ExternalLink, UserRoundCheck } from "lucide-react";
import { UiInput, UiTextarea } from "@/components/ui-controls";
import { UiFileUpload } from "@/components/ui-file-upload";
import { reportFeedbackApi, type ExternalFeedbackCase, type FeedbackResolutionGroup } from "@/lib/report-feedback-api";

function statusLabel(status: ExternalFeedbackCase["status"]) {
  if (status === "waiting") return "ממתין לתשובה";
  if (status === "resolved") return "נפתר";
  return "פתוח";
}

export function FeedbackExternalCaseResolver({
  organizationId,
  employerId,
  group,
  onChanged,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  onChanged: () => void;
}) {
  const initialCaseId = group.problems.find((problem) => problem.externalCaseId)?.externalCaseId ?? "";
  const [externalCase, setExternalCase] = useState<ExternalFeedbackCase | null>(null);
  const [loading, setLoading] = useState(Boolean(initialCaseId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState("");
  const [subject, setSubject] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");

  const externalProblems = useMemo(
    () => group.problems.filter((problem) =>
      problem.resolutionType === "external" || problem.availableActions.includes("openExternalCase")),
    [group.problems],
  );

  useEffect(() => {
    if (!initialCaseId) {
      setLoading(false);
      setExternalCase(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    reportFeedbackApi.externalCase(organizationId, employerId, initialCaseId)
      .then((result) => {
        if (!cancelled) setExternalCase(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת תיק הטיפול נכשלה.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organizationId, employerId, initialCaseId]);

  useEffect(() => {
    if (!externalCase) return;
    setDestination(externalCase.destination);
    setSubject(externalCase.subject);
    setMessageTemplate(externalCase.messageTemplate);
  }, [externalCase]);

  async function apply(next: Promise<ExternalFeedbackCase>) {
    setBusy(true);
    setError("");
    try {
      const result = await next;
      setExternalCase(result);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "עדכון תיק הטיפול נכשל.");
    } finally {
      setBusy(false);
    }
  }

  async function openCase() {
    if (!externalProblems.length) return;
    const first = externalProblems[0];
    await apply(reportFeedbackApi.openExternalCase(
      organizationId,
      employerId,
      first.reportId,
      group.groupKey,
      externalProblems.map((problem) => problem.problemId),
      note,
    ));
    setNote("");
  }

  async function download(id: string, name: string) {
    try {
      const blob = await reportFeedbackApi.downloadExternalCaseAttachment(
        organizationId, employerId, externalCase!.id, id,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "הורדת הקובץ נכשלה.");
    }
  }

  if (loading) return <section className="feedback-external-case"><div className="empty">טוען תיק טיפול...</div></section>;

  if (!externalCase) return <section className="feedback-external-case">
    <div className="feedback-resolution-section-head">
      <div>
        <h3>טיפול מול גוף חיצוני</h3>
        <p>ייפתח תיק אחד לקבוצת הטיפול. משוב המשך לאותה תנועה יצטרף לאותו תיק.</p>
      </div>
    </div>
    {error ? <div className="notice notice-error">{error}</div> : null}
    <label className="feedback-decision-note">
      <span>הערה לפתיחת התיק</span>
      <UiTextarea rows={3} maxLength={4000} value={note} disabled={busy}
        onChange={(event) => setNote(event.target.value)}
        placeholder="מה כבר נבדק ומה נדרש מהגוף החיצוני..." />
    </label>
    <button type="button" className="btn btn-primary" disabled={busy || !group.canExecute}
      onClick={() => void openCase()}>
      <ExternalLink size={16} />{busy ? "פותח תיק..." : "פתיחת תיק טיפול חיצוני"}
    </button>
  </section>;

  return <section className="feedback-external-case">
    <div className="feedback-resolution-section-head">
      <div>
        <h3>תיק טיפול חיצוני</h3>
        <p>סטטוס: <strong>{statusLabel(externalCase.status)}</strong>{externalCase.assigneeName ? ` · מטפל: ${externalCase.assigneeName}` : " · טרם שויך מטפל"}</p>
      </div>
    </div>
    {error ? <div className="notice notice-error">{error}</div> : null}

    <div className="feedback-external-case-actions">
      <button type="button" className="btn btn-secondary" disabled={busy}
        onClick={() => void apply(reportFeedbackApi.assignExternalCase(
          organizationId, employerId, externalCase.id, !externalCase.assignedToUserId,
        ))}>
        <UserRoundCheck size={16} />{externalCase.assignedToUserId ? "הסרת שיוך" : "קח לטיפול"}
      </button>
      <button type="button" className="btn btn-secondary" disabled={busy || externalCase.status === "waiting"}
        onClick={() => void apply(reportFeedbackApi.updateExternalCaseStatus(
          organizationId, employerId, externalCase.id, "waiting", "ממתין לתשובת הגוף החיצוני",
        ))}>
        <Clock3 size={16} />ממתין לתשובה
      </button>
      <button type="button" className="btn btn-primary" disabled={busy || externalCase.status === "resolved"}
        onClick={() => void apply(reportFeedbackApi.updateExternalCaseStatus(
          organizationId, employerId, externalCase.id, "resolved", note,
        ))}>
        <CheckCircle2 size={16} />סגירת התיק כפתור
      </button>
    </div>

    <div className="feedback-external-case-template">
      <label><span>יעד הפנייה</span><UiInput value={destination} disabled={busy}
        onChange={(event) => setDestination(event.target.value)} /></label>
      <label><span>נושא</span><UiInput value={subject} disabled={busy}
        onChange={(event) => setSubject(event.target.value)} /></label>
      <label><span>תוכן מוכן לפנייה</span><UiTextarea rows={8} maxLength={8000}
        value={messageTemplate} disabled={busy}
        onChange={(event) => setMessageTemplate(event.target.value)} /></label>
      <button type="button" className="btn btn-secondary" disabled={busy}
        onClick={() => void apply(reportFeedbackApi.updateExternalCaseTemplate(
          organizationId, employerId, externalCase.id, destination, subject, messageTemplate,
        ))}>שמירת תבנית</button>
    </div>

    <div className="feedback-external-case-note-row">
      <UiTextarea rows={3} maxLength={4000} value={note} disabled={busy}
        onChange={(event) => setNote(event.target.value)} placeholder="הוספת הערת טיפול..." />
      <button type="button" className="btn btn-secondary" disabled={busy || !note.trim()}
        onClick={() => void apply(reportFeedbackApi.addExternalCaseNote(
          organizationId, employerId, externalCase.id, note.trim(),
        )).then(() => setNote(""))}>הוספת הערה</button>
    </div>

    <UiFileUpload label="צירוף קובץ לתיק"
      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
      maxBytes={10_000_000} busy={busy} onInvalid={setError}
      onFileSelected={(file) => void apply(reportFeedbackApi.uploadExternalCaseAttachment(
        organizationId, employerId, externalCase.id, file,
      ))} />

    {externalCase.attachments.length ? <div className="feedback-external-case-files">
      <strong>קבצים</strong>
      {externalCase.attachments.map((file) => <button key={file.id} type="button"
        className="feedback-external-case-file"
        onClick={() => void download(file.id, file.originalFileName)}>
        <Download size={15} />{file.originalFileName}
      </button>)}
    </div> : null}

    <div className="feedback-external-case-problems">
      <strong>שגיאות בתיק</strong>
      {externalCase.problems.map((problem) => <div key={problem.problemId}>
        <b>קוד {problem.errorCode}</b><span>{problem.description}</span>
      </div>)}
    </div>

    <div className="feedback-external-case-history">
      <strong>היסטוריית טיפול</strong>
      {externalCase.events.map((event) => <div key={event.id}>
        <span>{event.actorName || "משתמש"} · {new Date(event.createdAt).toLocaleString("he-IL")}</span>
        <small>{event.note || event.eventType}</small>
      </div>)}
    </div>
  </section>;
}
