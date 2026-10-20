"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UiFileUpload } from "@/components/ui/ui-file-upload";
import { reportAttachmentsApi, type ReportAttachment, type ReportAttachmentList } from "../attachments-api";
import { errorMessage } from "@/lib/api/error-messages";

export function ReportProductDocuments({ organizationId, employerId, reportId, reportProductId, productType, correctionWorkspace }: {
  organizationId: string; employerId: string; reportId: string; reportProductId: string;
  productType: number; correctionWorkspace: boolean;
}) {
  const [data, setData] = useState<ReportAttachmentList | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void reportAttachmentsApi.list(organizationId, employerId, reportId)
      .then(result => { if (active) setData(result); })
      .catch(error => { if (active) toast.error(errorMessage(error, "טעינת מסמכי הדיווח נכשלה")); });
    return () => { active = false; };
  }, [organizationId, employerId, reportId]);

  if (correctionWorkspace) return null;
  if (!reportProductId) return <section className="profile-form-section"><h3>מסמכים</h3>
    <p>כדי לצרף מסמכים למוצר חדש, שמרו תחילה את המוצר בדיווח.</p></section>;

  const options = (data?.documentTypes ?? []).filter(type => type.scope === "product" &&
    (type.code !== 5 || productType === 1));
  async function upload(file: File, code: 3 | 4 | 5 | 6) {
    setBusy(true);
    try {
      await reportAttachmentsApi.upload(organizationId, employerId, reportId, code, file, reportProductId);
      setData(await reportAttachmentsApi.list(organizationId, employerId, reportId));
      toast.success("המסמך צורף לדיווח.");
    } catch (error) { toast.error(errorMessage(error, "העלאת המסמך נכשלה")); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("למחוק את המסמך מהדיווח?")) return;
    setBusy(true);
    try {
      await reportAttachmentsApi.remove(organizationId, employerId, reportId, id);
      setData(await reportAttachmentsApi.list(organizationId, employerId, reportId));
      toast.success("המסמך הוסר מהדיווח.");
    } catch (error) { toast.error(errorMessage(error, "מחיקת המסמך נכשלה")); }
    finally { setBusy(false); }
  }
  return <section className="profile-form-section" aria-label="מסמכים למוצר בדיווח">
    <h3>מסמכים לדיווח</h3>
    {!data ? <p>טוען מסמכים...</p> : options.length === 0 ? <p>אין סוגי מסמכים זמינים למוצר הזה בדיווח הנוכחי.</p>
      : options.map(type => {
        const existing = data.items.find((item: ReportAttachment) => item.reportProductId === reportProductId && item.documentTypeCode === type.code);
        return <div key={type.code} className="field" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <strong>{type.name}</strong>
          {existing ? <><span>{existing.originalFileName}</span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void remove(existing.id)}>הסרה</button></>
          : <UiFileUpload id={`report-document-${reportProductId}-${type.code}`} label="העלאת PDF"
              accept=".pdf,application/pdf" maxBytes={10 * 1024 * 1024} busy={busy} disabled={busy}
              onFileSelected={file => upload(file, type.code)} onInvalid={toast.error} />}
        </div>;
      })}
  </section>;
}
