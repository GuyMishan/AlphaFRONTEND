"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CreditCard, FileUp, Pencil, Search, X } from "lucide-react";
import { alphaApi } from "@/lib/api";
import { manualDepositsApi, type ManualDepositRow, type ManualPaymentInput } from "@/lib/manual-deposits-api";
import type { Employer } from "@/lib/types";

const productNames: Record<number, string> = { 1: "קרן פנסיה", 2: "קרן השתלמות", 3: "ביטוח מנהלים", 4: "קופת גמל", 99: "אחר" };

export function ManualDepositData({ organizationId, employerId, reportId }: { organizationId: string; employerId: string; reportId: string }) {
  const [rows, setRows] = useState<ManualDepositRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualDepositRow | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);

  async function load() {
    setLoading(true); setError("");
    try { setRows((await manualDepositsApi.list(organizationId, employerId, reportId, query, 0, 100)).items); }
    catch (err) { setError(err instanceof Error ? err.message : "טעינת נתוני ההפקדות נכשלה"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    alphaApi.employer(organizationId, employerId).then(setEmployer).catch(() => setEmployer(null));
  }, [organizationId, employerId, reportId]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalDeposit || 0), 0), [rows]);

  return <>
    <div className="card-head deposit-head">
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--muted)" }}>פרטי התשלום והאסמכתאות של הדיווח הנוכחי בלבד.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} שורות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="יצרן, מוצר, עובד או אסמכתא" /></div><button className="btn btn-soft" onClick={() => void load()}>חיפוש</button></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <div className="empty">טוען נתוני הפקדות...</div> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות בדיווח</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד לדיווח הנוכחי.</span></div> : <div className="deposit-table-wrap"><table className="deposit-table"><thead><tr><th>שם יצרן / מוצר</th><th>חשבון יצרן</th><th>סכום לתשלום</th><th>אופן תשלום</th><th>פרטי חשבון מעסיק</th><th>מס׳ אסמכתא</th><th>תאריך ערך</th><th>סוג דיווח</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.providerName || productNames[row.productType] || "מוצר פנסיוני"}</b><span>{row.employeeName} · {row.policyNumber || "ללא מס׳ פוליסה"}</span></td><td>{row.providerAccount || "—"}</td><td>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</td><td>{row.paymentMethod || "העברה בנקאית"}</td><td>{formatEmployerAccount(row)}</td><td>{row.referenceNumber || "—"}</td><td>{row.valueDate ? formatDate(row.valueDate) : "—"}</td><td>{row.reportingType}</td><td><button className="icon-button" aria-label="עריכת אמצעי תשלום" onClick={() => setEditing(row)}><Pencil size={17} /></button></td></tr>)}</tbody></table></div>}
    {editing ? <DepositPaymentEditor employer={employer} organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing} onClose={() => setEditing(null)} onSaved={(updated) => {
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    }} /> : null}
  </>;
}

function formatEmployerAccount(row: ManualDepositRow) {
  const values = [row.employerBankCode, row.employerBranch, row.employerAccount].filter(Boolean);
  return values.length ? values.join(" - ") : "—";
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("he-IL");
}

function DepositPaymentEditor({ employer, organizationId, employerId, reportId, row, onClose, onSaved }: {
  employer: Employer | null;
  organizationId: string;
  employerId: string;
  reportId: string;
  row: ManualDepositRow;
  onClose: () => void;
  onSaved: (row: ManualDepositRow) => void;
}) {
  const [form, setForm] = useState<ManualPaymentInput>({
    providerName: row.providerName || productNames[row.productType] || "",
    providerAccount: row.providerAccount || "",
    paymentMethod: row.paymentMethod || "העברה בנקאית",
    valueDate: row.valueDate,
    referenceNumber: row.referenceNumber || "",
    employerBankName: row.employerBankName || "",
    employerBankCode: row.employerBankCode || "",
    employerBranch: row.employerBranch || "",
    employerAccount: row.employerAccount || "",
    confirmationFileName: row.confirmationFileName || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch<K extends keyof ManualPaymentInput>(key: K, value: ManualPaymentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setError("");
    if (!form.providerName.trim()) { setError("יש להזין שם יצרן / מוצר."); return; }
    if (!form.paymentMethod.trim()) { setError("יש לבחור אופן תשלום."); return; }
    setSaving(true);
    try {
      await manualDepositsApi.savePayment(organizationId, employerId, reportId, row.id, form);
      onSaved({ ...row, ...form });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת פרטי אמצעי התשלום נכשלה");
      setSaving(false);
    }
  }

  return <div className="report-modal-backdrop payment-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="payment-modal" role="dialog" aria-modal="true" aria-label="פרטי אמצעי תשלום">
      <button className="payment-modal-close" onClick={onClose} aria-label="סגירה"><X size={22} /></button>
      <div className="payment-modal-title">פרטי אמצעי תשלום</div>
      <div className="payment-employer-chip"><BriefcaseBusiness size={19} /><b>{employer?.legalName || "המעסיק"}</b><span>{employer?.registrationNumber || ""}</span><CreditCard size={16} /></div>

      {error ? <div className="notice notice-error payment-error">{error}</div> : null}

      <div className="payment-layout">
        <aside className="payment-notes">
          <b>לתשומת לבך</b>
          <p>יש להזין את פרטי התשלום והאסמכתא המתאימים להעברה שבוצעה עבור הדיווח הנוכחי.</p>
          <p>בהעברה בנקאית יש לציין את תאריך הערך, מספר האסמכתא ופרטי חשבון המעסיק שממנו בוצעה ההעברה.</p>
          <p>הסכום מוצג לפי נתוני ההפקדות שנקלטו בדיווח ואינו משנה את רכיבי ההפקדה של העובד.</p>
        </aside>

        <div className="payment-main">
          <section className="payment-panel">
            <h3>פרטי חשבון יצרן לזיכוי</h3>
            <div className="payment-provider-grid">
              <div className="field payment-provider-name"><label>שם יצרן / מוצר</label><input value={form.providerName} onChange={(e) => patch("providerName", e.target.value)} /></div>
              <div className="payment-amount"><span>סכום</span><b>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</b></div>
              <div className="field payment-provider-account"><label>חשבון יצרן לזיכוי</label><div className="payment-input-icon"><input value={form.providerAccount} onChange={(e) => patch("providerAccount", e.target.value)} placeholder="בנק - סניף - חשבון" /><Pencil size={16} /></div></div>
            </div>
          </section>

          <section className="payment-panel">
            <h3>פרטי אופן תשלום</h3>
            <div className="payment-method-grid">
              <div className="field payment-method"><label>אופן התשלום</label><select value={form.paymentMethod} onChange={(e) => patch("paymentMethod", e.target.value)}><option>העברה בנקאית</option><option>מס״ב</option><option>המחאה</option><option>אחר</option></select></div>
              <div className="field"><label>תאריך ערך</label><div className="payment-input-icon"><input type="date" value={form.valueDate?.slice(0, 10) || ""} onChange={(e) => patch("valueDate", e.target.value || null)} /><CalendarDays size={16} /></div></div>
              <div className="field"><label>מס׳ אסמכתא</label><input value={form.referenceNumber} onChange={(e) => patch("referenceNumber", e.target.value)} /></div>
              <label className="payment-upload"><FileUp size={17} /><span>{form.confirmationFileName || "צירוף אישור העברה"}</span><input type="file" hidden onChange={(e) => patch("confirmationFileName", e.target.files?.[0]?.name || "")} /></label>
              <div className="field"><label>בנק</label><input value={form.employerBankName} onChange={(e) => patch("employerBankName", e.target.value)} placeholder="שם הבנק" /></div>
              <div className="field"><label>מס׳ בנק</label><input inputMode="numeric" value={form.employerBankCode} onChange={(e) => patch("employerBankCode", e.target.value)} /></div>
              <div className="field"><label>סניף</label><input inputMode="numeric" value={form.employerBranch} onChange={(e) => patch("employerBranch", e.target.value)} /></div>
              <div className="field"><label>מס׳ חשבון</label><input inputMode="numeric" value={form.employerAccount} onChange={(e) => patch("employerAccount", e.target.value)} /></div>
            </div>
          </section>
        </div>
      </div>

      <div className="payment-modal-footer"><button className="btn btn-primary" disabled={saving} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button><button className="btn btn-secondary" onClick={onClose}>ביטול</button></div>
    </div>
  </div>;
}
