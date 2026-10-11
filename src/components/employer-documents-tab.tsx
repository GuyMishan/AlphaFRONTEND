"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { backendFetch } from "@/lib/backend-fetch";
import { UiInput, UiSelect } from "@/components/ui-controls";
import { UiFileUpload } from "@/components/ui-file-upload";
import { alphaApi } from "@/lib/api";
import type { Employee } from "@/lib/types";

type Document = { id: string; documentTypeCode: number; employmentId: string | null; originalFileName: string; sizeBytes: number; createdAt: string };
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
export function EmployerDocumentsTab({ organizationId, employerId, canEdit }: { organizationId: string; employerId: string; canEdit: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [type, setType] = useState(3);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeError, setEmployeeError] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employmentId, setEmploymentId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const base = `/api/organizations/${organizationId}/employers/${employerId}/documents`;
  useEffect(() => {
    let active = true;
    backendFetch(base, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(await apiError(response));
      return response.json() as Promise<Document[]>;
    }).then(items => { if (active) setDocuments(items); })
      .catch(e => { if (active) toast.error(e instanceof Error ? e.message : "טעינת מסמכים נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base]);

  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    const timer = window.setTimeout(() => {
      alphaApi.employeeSearch(organizationId, employerId, employeeSearch.trim(), 0, 100)
        .then(result => { if (active) { setEmployees(result.items); setEmployeeError(""); } })
        .catch(() => { if (active) setEmployeeError("טעינת רשימת העובדים נכשלה."); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organizationId, employerId, canEdit, employeeSearch]);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file || (type !== 3 && !employmentId)) { toast.error("יש לבחור קובץ ועובד מתאים."); return; }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("documentTypeCode", String(type));
      if (type !== 3) data.set("employmentId", employmentId);
      const response = await backendFetch(base, { method: "POST", body: data });
      if (!response.ok) throw new Error(await apiError(response));
      const created = await response.json() as Document;
      setDocuments(current => [created, ...current]);
      setFile(null);
      toast.success("המסמך נשמר בפרופיל המעסיק");
    } catch (error) { toast.error(error instanceof Error ? error.message : "שמירת המסמך נכשלה"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("למחוק את המסמך ממאגר המעסיק?")) return;
    setBusy(true);
    try {
      const response = await backendFetch(`${base}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiError(response));
      setDocuments(current => current.filter(item => item.id !== id));
      toast.success("המסמך הוסר");
    } catch (e) { toast.error(e instanceof Error ? e.message : "המחיקה נכשלה"); }
    finally { setBusy(false); }
  }
  return <section className="card profile-card" aria-label="מסמכי מעסיק">
    <div className="card-head"><div><h2>מסמכים</h2><span style={{ color: "var(--muted)" }}>טפסים רשמיים המשויכים למעסיק. צירוף לדיווח נעשה בנפרד.</span></div></div>
    {canEdit ? <form className="form" onSubmit={upload}>
      <div className="grid two-cols">
        <div className="field"><label htmlFor="employer-document-type">סוג מסמך</label><UiSelect id="employer-document-type" value={type} onChange={e => setType(Number(e.target.value))}>{types.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</UiSelect></div>
        {type !== 3 ? <div className="field"><label htmlFor="employer-document-employee-search">חיפוש עובד משויך</label><UiInput id="employer-document-employee-search" value={employeeSearch} placeholder="שם עובד או מספר עובד" onChange={e => setEmployeeSearch(e.target.value)} /><label htmlFor="employer-document-employee">בחירת עובד</label><UiSelect id="employer-document-employee" value={employmentId} onChange={e => setEmploymentId(e.target.value)} required><option value="">בחירת עובד</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} · {employee.employeeNumber}</option>)}</UiSelect>{employeeError ? <small role="alert">{employeeError}</small> : null}</div> : null}
      </div>
      <div className="field"><UiFileUpload id="employer-document-file" label="בחירת קובץ PDF" fileName={file?.name} accept=".pdf,application/pdf" maxBytes={10 * 1024 * 1024} disabled={busy} onFileSelected={setFile} onInvalid={toast.error} /></div>
      <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={busy || !file || (type !== 3 && !employmentId)}>{busy ? "מעלה..." : "העלאת מסמך"}</button></div>
    </form> : null}
    {loading ? <div className="empty">טוען מסמכים...</div> : documents.length === 0 ? <div className="empty">עדיין אין מסמכים במאגר המעסיק.</div> :
      <div className="employer-documents-list">{documents.map(doc => <div key={doc.id} className="row" style={{ justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
        <div><b>{types.find(item => item.code === doc.documentTypeCode)?.label ?? "מסמך"}</b><div>{doc.originalFileName}</div><small>{new Date(doc.createdAt).toLocaleDateString("he-IL")} · {Math.round(doc.sizeBytes / 1024)} KB</small></div>
        <div className="row" style={{ gap: 8 }}>
          <a className="btn btn-secondary" href={`/api/backend${base}/${doc.id}/file`}>הורדה</a>
          {canEdit ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void remove(doc.id)}>מחיקה</button> : null}
        </div>
      </div>)}</div>}
  </section>;
}
