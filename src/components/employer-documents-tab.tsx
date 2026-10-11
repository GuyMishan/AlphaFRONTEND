"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { backendFetch } from "@/lib/backend-fetch";
import { UiSelect } from "@/components/ui-controls";
import { UiFileUpload } from "@/components/ui-file-upload";

export type EmployerDocument = { id: string; documentTypeCode: number; employmentId: string | null; employeePensionProductId: string | null; originalFileName: string; sizeBytes: number; createdAt: string };
const types = [
  { code: 3, label: "תצהיר מעסיק" },
  { code: 4, label: "אישור עובד להשבת כספים" },
  { code: 5, label: "בקשת הצטרפות לקרן ברירת מחדל" },
  { code: 6, label: "הצהרת מעסיק – הסכם קיבוצי" },
];
async function apiError(response: Response) {
  try { const data = await response.json() as { error?: string }; return data.error || "הפעולה נכשלה"; }
  catch { return "הפעולה נכשלה"; }
}
export function EmployerDocumentsTab({ organizationId, employerId, canEdit, employmentId, employeePensionProductId, embedded = false, loadedDocuments, onChanged, productType }: {
  organizationId: string; employerId: string; canEdit: boolean; employmentId?: string;
  employeePensionProductId?: string; embedded?: boolean; loadedDocuments?: EmployerDocument[];
  onChanged?: () => Promise<void>; productType?: number;
}) {
  const [documents, setDocuments] = useState<EmployerDocument[]>([]);
  const [type, setType] = useState(employmentId ? 4 : 3);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const availableTypes = types.filter(item => employmentId
    ? item.code !== 3 && (item.code !== 5 || productType == null || productType === 1)
    : item.code === 3);
  const visibleDocuments = loadedDocuments === undefined ? documents
    : loadedDocuments.filter(doc => doc.employeePensionProductId === (employeePensionProductId ?? null)
        && doc.employmentId === (employmentId ?? null));
  const base = `/api/organizations/${organizationId}/employers/${employerId}/documents`;
  const listParams = new URLSearchParams();
  if (employmentId) listParams.set("employmentId", employmentId);
  if (employeePensionProductId) listParams.set("employeePensionProductId", employeePensionProductId);
  const listUrl = `${base}${listParams.size ? `?${listParams}` : ""}`;
  useEffect(() => {
    if (loadedDocuments !== undefined) { setLoading(false); return; }
    let active = true;
    backendFetch(listUrl, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(await apiError(response));
      return response.json() as Promise<EmployerDocument[]>;
    }).then(items => { if (active) setDocuments(items); })
      .catch(e => { if (active) toast.error(e instanceof Error ? e.message : "טעינת מסמכים נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listUrl, loadedDocuments]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) { toast.error("יש לבחור קובץ PDF."); return; }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("documentTypeCode", String(availableTypes.some(item => item.code === type) ? type : availableTypes[0]?.code ?? type));
      if (employmentId) data.set("employmentId", employmentId);
      if (employeePensionProductId) data.set("employeePensionProductId", employeePensionProductId);
      const response = await backendFetch(base, { method: "POST", body: data });
      if (!response.ok) throw new Error(await apiError(response));
      const created = await response.json() as EmployerDocument;
      if (loadedDocuments === undefined) setDocuments(current => [created, ...current]);
      else await onChanged?.();
      setFile(null);
      toast.success(employmentId ? "המסמך נשמר במוצר הפנסיוני" : "המסמך נשמר בפרופיל המעסיק");
    } catch (error) { toast.error(error instanceof Error ? error.message : "שמירת המסמך נכשלה"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("למחוק את המסמך?")) return;
    setBusy(true);
    try {
      const response = await backendFetch(`${base}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiError(response));
      if (loadedDocuments === undefined) setDocuments(current => current.filter(item => item.id !== id));
      else await onChanged?.();
      toast.success("המסמך הוסר");
    } catch (e) { toast.error(e instanceof Error ? e.message : "המחיקה נכשלה"); }
    finally { setBusy(false); }
  }
  return <section className={embedded ? "profile-form-section" : "card profile-card"} aria-label={employmentId ? "מסמכי עובד" : "מסמכי מעסיק"}>
    <div className="card-head"><div><h2>מסמכים</h2><span style={{ color: "var(--muted)" }}>{employmentId ? "טפסים רשמיים המשויכים למוצר הפנסיוני הזה." : "טפסים רשמיים של המעסיק."} צירוף לדיווח נעשה בנפרד.</span></div></div>
    {canEdit ? <form className="form" onSubmit={upload}>
      <div className="grid two-cols">
        <div className="field"><label htmlFor={`employer-document-type-${employeePensionProductId ?? "employer"}`}>סוג מסמך</label><UiSelect id={`employer-document-type-${employeePensionProductId ?? "employer"}`} value={availableTypes.some(item => item.code === type) ? type : availableTypes[0]?.code ?? 3} onChange={e => setType(Number(e.target.value))}>{availableTypes.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</UiSelect></div>

      </div>
      <div className="field"><UiFileUpload id={`employer-document-file-${employeePensionProductId ?? "employer"}`} label="בחירת קובץ PDF" fileName={file?.name} accept=".pdf,application/pdf" maxBytes={10 * 1024 * 1024} disabled={busy} onFileSelected={setFile} onInvalid={toast.error} /></div>
      <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={busy || !file}>{busy ? "מעלה..." : "העלאת מסמך"}</button></div>
    </form> : null}
    {loading ? <div className="empty">טוען מסמכים...</div> : visibleDocuments.length === 0 ? <div className="empty">עדיין אין מסמכים.</div> :
      <div className="employer-documents-list">{visibleDocuments.map(doc => <div key={doc.id} className="row" style={{ justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
        <div><b>{types.find(item => item.code === doc.documentTypeCode)?.label ?? "מסמך"}</b><div>{doc.originalFileName}</div><small>{new Date(doc.createdAt).toLocaleDateString("he-IL")} · {Math.round(doc.sizeBytes / 1024)} KB</small></div>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn btn-secondary" href={`/api/backend${base}/${doc.id}/file`}>הורדה</a>
          {canEdit ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void remove(doc.id)}>מחיקה</button> : null}
        </div>
      </div>)}</div>}
  </section>;
}
