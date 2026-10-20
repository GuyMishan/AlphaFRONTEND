"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { employerDocumentsApi, type EmployerDocument } from "@/features/employers/documents-api";
import { UiFileUpload } from "@/components/ui/ui-file-upload";
import { DataTable } from "@/components/ui/data-table";
import { saveBlob } from "@/lib/download";
import { formatDateDDMMYYYY } from "@/lib/format/date";
import { errorMessage } from "@/lib/api/error-messages";
import { Tooltip } from "@/components/ui/tooltip";

const types = [
  { code: 3, label: "תצהיר מעסיק" },
  { code: 7, label: "הסכם התקשרות עם ALPHA" },
  { code: 4, label: "אישור עובד להשבת כספים" },
  { code: 5, label: "בקשת הצטרפות לקרן ברירת מחדל" },
  { code: 6, label: "הצהרת מעסיק – הסכם קיבוצי" },
];
export function EmployerDocumentsTab({ organizationId, employerId, canEdit, employmentId, employeePensionProductId, embedded = false, loadedDocuments, onChanged, productType }: {
  organizationId: string; employerId: string; canEdit: boolean; employmentId?: string;
  employeePensionProductId?: string; embedded?: boolean; loadedDocuments?: EmployerDocument[];
  onChanged?: () => Promise<void>; productType?: number;
}) {
  const [documents, setDocuments] = useState<EmployerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const availableTypes = types.filter(item => employmentId
    ? (item.code === 4 || (item.code === 5 && (productType == null || productType === 1)))
    : item.code === 3 || item.code === 7);
  const visibleDocuments = loadedDocuments === undefined ? documents
    : loadedDocuments.filter(doc => doc.employeePensionProductId === (employeePensionProductId ?? null)
        && doc.employmentId === (employmentId ?? null));
  useEffect(() => {
    if (loadedDocuments !== undefined) { setLoading(false); return; }
    let active = true;
    employerDocumentsApi.list(organizationId, employerId, { employmentId, employeePensionProductId })
      .then(items => { if (active) setDocuments(items); })
      .catch(e => { if (active) toast.error(errorMessage(e, "טעינת מסמכים נכשלה")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, employerId, employmentId, employeePensionProductId, loadedDocuments]);

  async function upload(file: File, documentTypeCode: number) {
    if (file.size === 0 || file.size > 10 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      toast.error("יש לבחור קובץ PDF תקין בגודל של עד 10MB.");
      return;
    }
    setBusy(true);
    try {
      const created = await employerDocumentsApi.upload(organizationId, employerId, file, documentTypeCode, { employmentId, employeePensionProductId });
      if (loadedDocuments === undefined) setDocuments(current => [created, ...current]);
      else await onChanged?.();
      toast.success(employmentId ? "המסמך נשמר במוצר הפנסיוני" : "המסמך נשמר בפרופיל המעסיק");
    } catch (error) { toast.error(errorMessage(error, "שמירת המסמך נכשלה")); }
    finally { setBusy(false); }
  }
  async function download(doc: EmployerDocument) {
    try {
      saveBlob(await employerDocumentsApi.download(organizationId, employerId, doc.id), doc.originalFileName);
    } catch (error) { toast.error(errorMessage(error, "הורדת המסמך נכשלה")); }
  }
  async function remove(id: string) {
    if (!window.confirm("למחוק את המסמך?")) return;
    setBusy(true);
    try {
      await employerDocumentsApi.remove(organizationId, employerId, id);
      if (loadedDocuments === undefined) setDocuments(current => current.filter(item => item.id !== id));
      else await onChanged?.();
      toast.success("המסמך הוסר");
    } catch (e) { toast.error(errorMessage(e, "המחיקה נכשלה")); }
    finally { setBusy(false); }
  }
  // Embedded inside a pension product card: compact rows and buttons so the card stays readable.
  const buttonClass = embedded ? "btn btn-secondary btn-sm" : "btn btn-secondary";
  return <section className={embedded ? "profile-form-section" : "card profile-card"} aria-label={employmentId ? "מסמכי עובד" : "מסמכי מעסיק"}>
    <div className="card-head"><div>{embedded ? <h3>מסמכים</h3> : <h2>מסמכים</h2>}<span style={{ color: "var(--color-text-muted)" }}>{employmentId ? "טפסים רשמיים המשויכים למוצר הפנסיוני הזה." : "טפסים רשמיים של המעסיק."} צירוף לדיווח נעשה בנפרד.</span></div></div>
    <DataTable
      items={availableTypes}
      columns={[{ key: "type", label: "סוג מסמך", width: "28%" }, { key: "file", label: "מסמך שהועלה", width: "42%" }, { key: "actions", label: "פעולות", width: "30%" }]}
      rowKey={(item) => String(item.code)}
      rowHeight={embedded ? 64 : 92}
      minTableWidth={440}
      loading={loading}
      maxHeight={500}
      renderCells={(item) => {
        const existing = visibleDocuments.filter(doc => doc.documentTypeCode === item.code)
          .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
        return [
          <div key="type" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <strong>{item.label}</strong>
            {item.code === 7 ? <Tooltip portaled label="משמעות העלאת הסכם ההתקשרות"
              content="בהעלאת המסמך אתם מאשרים בשם המעסיק את תנאי השימוש והמדיניויות של ALPHA. כדי לשדר דיווחים חייב להיות הסכם במערכת." /> : null}
          </div>,
          <div key="file">
            {existing.length ? existing.map(doc => <div key={doc.id} style={{ marginBottom: 6 }}>
              <span>{doc.originalFileName}</span>
              <small style={{ display: "block", color: "var(--color-text-muted)" }}>{formatDateDDMMYYYY(doc.createdAt)} · {Math.round(doc.sizeBytes / 1024)} KB</small>
            </div>) : <span style={{ color: "var(--color-text-muted)" }}>לא הועלה מסמך</span>}
          </div>,
          <div key="actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {existing.map(doc => <div key={doc.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={buttonClass} onClick={() => void download(doc)}
                aria-label={`הורדת ${doc.originalFileName}`}>הורדה</button>
              {canEdit ? <button type="button" className={buttonClass} disabled={busy}
                onClick={() => void remove(doc.id)} aria-label={`מחיקת ${doc.originalFileName}`}>מחיקה</button> : null}
            </div>)}
            {canEdit && existing.length === 0 ? <UiFileUpload
              id={`employer-document-file-${employeePensionProductId ?? "employer"}-${item.code}`}
              label="העלאה" className={buttonClass} accept=".pdf,application/pdf"
              maxBytes={10 * 1024 * 1024} disabled={busy} busy={busy}
              onFileSelected={(selected) => upload(selected, item.code)} onInvalid={toast.error} /> : null}
          </div>
        ];
      }}
    />
  </section>;
}
