"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reportValidationApi } from "../../validation-api";
import { reportTransmissionApi } from "../../transmission-api";
import { errorMessage } from "@/lib/api/error-messages";
import { AppModal } from "@/components/ui/app-modal";
import { derivedReportsApi, type CorrectionRoutePreview } from "../../derived-reports-api";

export function CorrectionRouteModal({ organizationId, employerId, workspaceId, onClose }: {
  organizationId: string; employerId: string; workspaceId: string; onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [created, setCreated] = useState<{ negativeReportId: string | null; currentReportId: string | null } | null>(null);
  const [routes, setRoutes] = useState<CorrectionRoutePreview[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    derivedReportsApi.correctionRoutes(organizationId, employerId, workspaceId)
      .then(data => { if (active) setRoutes(data.routes); })
      .catch(() => { if (active) setError("לא ניתן לטעון מסלולי תיקון."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, employerId, workspaceId]);
  async function finish() {
    if (!selected || submitting || !routes.some(route => route.id === selected)) return;
    setSubmitting(true);
    setError("");
    let documents = created;
    try {
      if (!documents) {
        setProgress("יוצר מסמכי תיקון...");
        const result = await derivedReportsApi.completeCorrection(organizationId, employerId, workspaceId, selected);
        documents = { negativeReportId: result.negativeReportId, currentReportId: result.currentReportId };
        setCreated(documents);
      }
      for (const [kind, reportId] of [
        ["הדיווח השלילי", documents.negativeReportId],
        ["הדיווח השוטף המתקן", documents.currentReportId],
      ] as const) {
        if (!reportId) continue;
        // Never retry a report that may already have been dispatched; an ambiguous
        // provider outcome must be reconciled from its saved history.
        const history = await reportTransmissionApi.history(organizationId, employerId, reportId);
        if (history.length > 0) {
          const report = await derivedReportsApi.metadata(organizationId, employerId, reportId);
          const status = String(report.status).toLowerCase();
          if (!["sent", "completed", "6", "8"].includes(status))
            throw new Error(`${kind}: קיימת פעולת שידור קודמת. יש לבדוק את הסטטוס במסך הדיווחים לפני ניסיון נוסף.`);
          continue;
        }
        setProgress(`מאמת את ${kind}...`);
        const validation = await reportValidationApi.commit(organizationId, employerId, reportId, "final");
        if (!validation.isValid) throw new Error(`${kind}: ${validation.errors.slice(0, 3).join(" ") || "בדיקות 006 נכשלו"}`);
        const routing = await reportTransmissionApi.validateRouting(organizationId, employerId, reportId);
        if (!routing.canTransmit) throw new Error(`${kind}: מסלול השידור אינו תקין או אינו מוגדר.`);
        setProgress(`משדר את ${kind}...`);
        await reportTransmissionApi.send(organizationId, employerId, reportId);
      }
      toast.success("מסמכי התיקון שודרו. ממתינים למשובי המסלקה והיצרנים.");
      router.push("/reports");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "שידור התיקון לא הושלם. בדקו את הדיווחים שנוצרו לפני ניסיון נוסף."));
    } finally {
      setProgress("");
      setSubmitting(false);
    }
  }
  return <AppModal title="בחירת מסלול תיקון" width="md" onClose={onClose} closeDisabled={submitting}
    actions={<>
      <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>חזרה לעריכה</button>
      <button type="button" className="btn btn-primary" disabled={!selected || submitting || loading || !!error} onClick={() => void finish()}>{submitting ? "מבצע תיקון ושידור..." : "אישור ושליחת התיקון"}</button>
    </>}>
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {progress ? <div className="notice notice-info" role="status">{progress}</div> : null}
    {created ? <div className="notice notice-info">מסמכי התיקון נוצרו. {created.negativeReportId ? `שלילי: ${created.negativeReportId}. ` : ""}{created.currentReportId ? `שוטף: ${created.currentReportId}.` : ""} אם השידור לא הושלם, בדקו אותם במסך הדיווחים.</div> : null}
    {loading ? <p>בודק מסלולי תיקון...</p> : !routes.length ? <div className="notice notice-info">לא נמצאו מסלולים זמינים. ודאו שקיימים שינויים תקפים.</div>
      : routes.length === 0 ? <div className="notice notice-info">לא נמצאו מסלולים זמינים. ודאו שקיימים שינויים תקפים.</div>
      : <div className="grid" style={{ gap: 12 }}>
        {routes.map(route => <label key={route.id} className="card" style={{ padding: 16 }}>
          <input type="checkbox" checked={selected === route.id}
            onChange={event => setSelected(event.target.checked ? route.id : "")} />
          <strong>{route.title}</strong>
          <p>{route.description}</p>
        </label>)}
        <div className="notice notice-info">האישור ייצור את מסמכי התיקון וישדר אותם לפי סדרם לאחר בדיקות 006. השלמת התיקון הסופית תלויה במשובי הגופים.</div>
      </div>}
  </AppModal>;
}
