"use client";
import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { derivedReportsApi, type CorrectionRoutePreview } from "../../derived-reports-api";

export function CorrectionRouteModal({ organizationId, employerId, workspaceId, onClose }: {
  organizationId: string; employerId: string; workspaceId: string; onClose: () => void;
}) {
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
  return <AppModal title="בחירת מסלול תיקון" width="md" onClose={onClose}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose}>חזרה לעריכה</button>
      <button type="button" className="btn btn-primary" disabled>אישור וסיום דיווח</button>
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
        <div className="notice notice-info">ניתן לעיין במסלול. האישור יופעל לאחר חיבור פעולת הסיום בבקאנד.</div>
      </div>}
  </AppModal>;
}
