"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { derivedReportsApi, type CorrectionRoutePreview } from "../../derived-reports-api";

export function CorrectionRouteModal({ organizationId, employerId, workspaceId, onClose }: {
  organizationId: string; employerId: string; workspaceId: string; onClose: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
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
    try {
      const result = await derivedReportsApi.completeCorrection(organizationId, employerId, workspaceId, selected);
      toast.success(result.transmitted
        ? "התיקון נשלח"
        : "מסמכי התיקון נוצרו ונשמרו. יש להשלים שידור של המסמכים במסך הדיווחים.");
      router.push("/reports");
      router.refresh();
    } catch {
      setError("לא ניתן לסיים את התיקון. ייתכן שהנתונים השתנו; חזרו לעריכה ובדקו את הדיווח.");
    } finally {
      setSubmitting(false);
    }
  }
  return <AppModal title="בחירת מסלול תיקון" width="md" onClose={onClose} closeDisabled={submitting}
    actions={<>
      <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>חזרה לעריכה</button>
      <button type="button" className="btn btn-primary" disabled={!selected || submitting || loading || !!error} onClick={() => void finish()}>{submitting ? "יוצר מסמכי תיקון..." : "אישור וסיום דיווח"}</button>
    </>}>
    {loading ? <p>בודק מסלולי תיקון...</p> : error ? <div className="notice notice-error" role="alert">{error}</div>
      : routes.length === 0 ? <div className="notice notice-info">לא נמצאו מסלולים זמינים. ודאו שקיימים שינויים תקפים.</div>
      : <div className="grid" style={{ gap: 12 }}>
        {routes.map(route => <label key={route.id} className="card" style={{ padding: 16 }}>
          <input type="checkbox" checked={selected === route.id}
            onChange={event => setSelected(event.target.checked ? route.id : "")} />
          <strong>{route.title}</strong>
          <p>{route.description}</p>
        </label>)}
        <div className="notice notice-info">האישור ייצור מסמכי תיקון לפי המסלול שנבחר. השידור עצמו יבוצע בנפרד לאחר בדיקת המסמכים.</div>
      </div>}
  </AppModal>;
}
