"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { backendFetch } from "@/lib/backend-fetch";
import { UiFileUpload } from "@/components/ui-file-upload";
import { DataTable } from "@/components/data-table";

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

  async function upload(file: File, documentTypeCode: number) {
    if (file.size === 0 || file.size > 10 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      toast.error("יש לבחור קובץ PDF תקין בגודל של עד 10MB.");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("documentTypeCode", String(documentTypeCode));
      if (employmentId) data.set("employmentId", employmentId);
      if (employeePensionProductId) data.set("employeePensionProductId", employeePensionProductId);
      const response = await backendFetch(base, { method: "POST", body: data });
      if (!response.ok) throw new Error(await apiError(response));
      const created = await response.json() as EmployerDocument;
      if (loadedDocuments === undefined) setDocuments(current => [created, ...current]);
      else await onChanged?.();
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
    <DataTable
      items={availableTypes}
      columns={[{ key: "type", label: "סוג מסמך", width: "28%" }, { key: "file", label: "מסמך שהועלה", width: "42%" }, { key: "actions", label: "פעולות", width: "30%" }]}
      rowKey={(item) => String(item.code)}
      rowHeight={92}
      minTableWidth={440}
      loading={loading}
      maxHeight={500}
      renderCells={(item) => {
        const existing = visibleDocuments.filter(doc => doc.documentTypeCode === item.code)
          .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
        return [
          <strong key="type">{item.label}</strong>,
          <div key="file">
            {existing.length ? existing.map(doc => <div key={doc.id} style={{ marginBottom: 6 }}>
              <span>{doc.originalFileName}</span>
              <small style={{ display: "block", color: "var(--muted)" }}>{new Date(doc.createdAt).toLocaleDateString("he-IL")} · {Math.round(doc.sizeBytes / 1024)} KB</small>
            </div>) : <span style={{ color: "var(--muted)" }}>לא הועלה מסמך</span>}
          </div>,
          <div key="actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {existing.map(doc => <div key={doc.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn btn-secondary" href={`/api/backend${base}/${doc.id}/file`}
                aria-label={`הורדת ${doc.originalFileName}`}>הורדה</a>
              {canEdit ? <button type="button" className="btn btn-secondary" disabled={busy}
                onClick={() => void remove(doc.id)} aria-label={`מחיקת ${doc.originalFileName}`}>מחיקה</button> : null}
            </div>)}
            {canEdit && existing.length === 0 ? <UiFileUpload
              id={`employer-document-file-${employeePensionProductId ?? "employer"}-${item.code}`}
              label="העלאה" className="btn btn-secondary" accept=".pdf,application/pdf"
              maxBytes={10 * 1024 * 1024} disabled={busy} busy={busy}
              onFileSelected={(selected) => upload(selected, item.code)} onInvalid={toast.error} /> : null}
          </div>
        ];
      }}
    />
  </section>;
}
