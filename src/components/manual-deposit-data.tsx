"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CreditCard, FileUp, Pencil, Search, X } from "lucide-react";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { ReferenceOptionSelect } from "@/components/reference-option-select";
import { VirtualizedTable } from "@/components/virtualized-table";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { employerInterfaceApi, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/lib/employer-interface-api";
import { manualDepositsApi, type ManualDepositRow, type ManualPaymentInput } from "@/lib/manual-deposits-api";
import type { Employer } from "@/lib/types";
import { validatePayment } from "@/lib/validation";

const productNames: Record<number, string> = { 1: "קרן פנסיה", 2: "קרן השתלמות", 3: "ביטוח מנהלים", 4: "קופת גמל", 99: "אחר" };

export function ManualDepositData({ organizationId, employerId, reportId }: { organizationId: string; employerId: string; reportId: string }) {
  const [rows, setRows] = useState<ManualDepositRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualDepositRow | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);

  async function load(search = query) {
    setLoading(true); setError("");
    try { setRows((await manualDepositsApi.list(organizationId, employerId, reportId, search.trim(), 0, 100)).items); }
    catch (err) { const message = err instanceof Error ? err.message : "טעינת נתוני ההפקדות נכשלה"; setError(message); notify.error(message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setQuery("");
    void load("");
    alphaApi.employer(organizationId, employerId).then(setEmployer).catch(() => setEmployer(null));
  }, [organizationId, employerId, reportId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalDeposit || 0), 0), [rows]);

  return <>
    <div className="card-head deposit-head">
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--muted)" }}>פרטי התשלום, האסמכתאות ושדות ממשק מעסיקים 006 ברמת המוצר.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} תוצאות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><input maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="יצרן, מוצר, עובד או אסמכתא" /></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <div className="empty">טוען נתוני הפקדות...</div> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות בדיווח</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד לדיווח הנוכחי.</span></div> : <VirtualizedTable
      items={rows}
      rowKey={(row) => row.id}
      rowHeight={48}
      maxHeight={560}
      tableClassName="deposit-table"
      wrapperClassName="deposit-table-wrap"
      columns={[{ key: "provider", label: "שם יצרן / מוצר" }, { key: "providerAccount", label: "חשבון יצרן" }, { key: "amount", label: "סכום לתשלום" }, { key: "method", label: "אופן תשלום" }, { key: "employerAccount", label: "פרטי חשבון מעסיק" }, { key: "reference", label: "מס׳ אסמכתא" }, { key: "date", label: "תאריך ערך" }, { key: "type", label: "סוג תקבול" }, { key: "edit", label: "" }]}
      renderCells={(row) => [
        <><b>{row.providerName || productNames[row.productType] || "מוצר פנסיוני"}</b><span>{row.employeeName} · {row.policyNumber || "ללא מס׳ פוליסה"}</span></>,
        row.providerAccount || "—",
        `₪${Number(row.totalDeposit).toLocaleString("he-IL")}`,
        row.paymentMethod || "העברה בנקאית",
        formatEmployerAccount(row),
        row.referenceNumber || "—",
        row.valueDate ? formatDate(row.valueDate) : "—",
        row.reportingType ? `קוד ${row.reportingType}` : "—",
        <button className="icon-button" aria-label="עריכת אמצעי תשלום ונתוני 006" onClick={() => setEditing(row)}><Pencil size={17} /></button>,
      ]}
    />}
    {editing ? <DepositPaymentEditor employer={employer} organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing} onClose={() => setEditing(null)} onSaved={(updated) => {
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      notify.success("פרטי התשלום ונתוני ממשק 006 נשמרו בהצלחה");
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

function emptyMetadata(): EmployerInterfaceProductMetadataInput {
  return {
    operationCode: null,
    depositStatus: null,
    employeeStatus: null,
    statusStartDate: null,
    employmentPercentage: null,
    workDaysInMonth: null,
    lastDeposit: null,
    refundReason: null,
    paymentMethodCode: null,
    employerAccountType: null,
    receiverAccountType: null,
  };
}

function isNegativeKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) {
  return value === 3 || value === "3" || value === "Negative";
}

function isDifferencesKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) {
  return value === 2 || value === "2" || value === "Differences";
}

function validate006Metadata(metadata: EmployerInterfaceProductMetadata | null, form: EmployerInterfaceProductMetadataInput) {
  const errors: string[] = [];
  if (!metadata) return ["נתוני ממשק מעסיקים 006 עדיין נטענים."];
  if (isDifferencesKind(metadata.reportKind)) return errors;
  const negative = isNegativeKind(metadata.reportKind);
  if (!form.operationCode) errors.push("סוג פעולה הוא שדה חובה.");
  if (!negative && !form.depositStatus) errors.push("מעמד הפקדה בקופה הוא שדה חובה בדיווח שוטף.");
  if (!negative && !form.employeeStatus) errors.push("סטטוס עובד בחודש השכר הוא שדה חובה בדיווח שוטף.");
  if (!negative && !form.statusStartDate) errors.push("תאריך תחילת סטטוס הוא שדה חובה בדיווח שוטף.");
  if (!negative && !form.lastDeposit) errors.push("יש לציין האם זו הפקדה אחרונה בדיווח שוטף.");
  if (negative && !form.refundReason) errors.push("סיבת בקשה להחזר כספים היא שדה חובה בדיווח שלילי.");
  if (!form.paymentMethodCode) errors.push("קוד אמצעי תשלום 006 הוא שדה חובה.");
  if (!form.employerAccountType) errors.push("סוג חשבון מעסיק הוא שדה חובה.");
  if (!form.receiverAccountType) errors.push("סוג חשבון קולט תשלום הוא שדה חובה.");
  if (form.employmentPercentage != null && (form.employmentPercentage < 1 || form.employmentPercentage > 100)) errors.push("חלקיות משרה חייבת להיות בין 1 ל־100.");
  if (form.workDaysInMonth != null && (form.workDaysInMonth < 0 || form.workDaysInMonth > 31)) errors.push("ימי עבודה בחודש חייבים להיות בין 0 ל־31.");
  return errors;
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
  const [metadata, setMetadata] = useState<EmployerInterfaceProductMetadata | null>(null);
  const [metadataForm, setMetadataForm] = useState<EmployerInterfaceProductMetadataInput>(emptyMetadata);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingMetadata(true);
    employerInterfaceApi.productMetadata(organizationId, employerId, reportId, row.id)
      .then((item) => {
        if (!active) return;
        setMetadata(item);
        setMetadataForm({
          operationCode: item.operationCode,
          depositStatus: item.depositStatus,
          employeeStatus: item.employeeStatus,
          statusStartDate: item.statusStartDate,
          employmentPercentage: item.employmentPercentage,
          workDaysInMonth: item.workDaysInMonth,
          lastDeposit: item.lastDeposit,
          refundReason: item.refundReason,
          paymentMethodCode: item.paymentMethodCode,
          employerAccountType: item.employerAccountType,
          receiverAccountType: item.receiverAccountType,
        });
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת נתוני 006 נכשלה"); })
      .finally(() => { if (active) setLoadingMetadata(false); });
    return () => { active = false; };
  }, [organizationId, employerId, reportId, row.id]);

  function patch<K extends keyof ManualPaymentInput>(key: K, value: ManualPaymentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function patchMetadata<K extends keyof EmployerInterfaceProductMetadataInput>(key: K, value: EmployerInterfaceProductMetadataInput[K]) {
    setMetadataForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function save() {
    setError("");
    const errors = validatePayment(form);
    errors.push(...validate006Metadata(metadata, metadataForm));
    if (errors.length) { const message = errors.join(" "); setError(message); notify.error(message); return; }
    setSaving(true);
    try {
      await manualDepositsApi.savePayment(organizationId, employerId, reportId, row.id, form);
      if (!isDifferencesKind(metadata?.reportKind))
        await employerInterfaceApi.updateProductMetadata(organizationId, employerId, reportId, row.id, metadataForm);
      onSaved({ ...row, ...form });
    } catch (err) {
      const message = err instanceof Error ? err.message : "שמירת פרטי אמצעי התשלום נכשלה";
      setError(message);
      notify.error(message);
      setSaving(false);
    }
  }

  const bankRequired = form.paymentMethod === "העברה בנקאית" || form.paymentMethod === "מס״ב";
  const negative = isNegativeKind(metadata?.reportKind);
  const differences = isDifferencesKind(metadata?.reportKind);
  const operationScope = negative ? "negative" : "current";

  return <div className="report-modal-backdrop payment-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="payment-modal" role="dialog" aria-modal="true" aria-label="פרטי אמצעי תשלום">
      <button className="payment-modal-close" onClick={onClose} aria-label="סגירה"><X size={20} /></button>
      <div className="payment-modal-title">פרטי תשלום וממשק מעסיקים 006</div>
      <div className="payment-employer-chip"><BriefcaseBusiness size={17} /><b>{employer?.legalName || "המעסיק"}</b><span>{employer?.registrationNumber || ""}</span><CreditCard size={15} /></div>
      {error ? <div className="notice notice-error payment-error">{error}</div> : null}
      {differences ? <div className="notice notice-info payment-error">דיווח הפרשים אינו משודר ישירות בממשק 006. את נתוני 006 משלימים לאחר יצירת דיווח שוטף או שלילי ממנו.</div> : null}
      <div className="payment-layout">
        <aside className="payment-notes"><b>לתשומת לבך</b><p>יש להזין את פרטי התשלום והאסמכתא המתאימים להעברה שבוצעה עבור הדיווח הנוכחי.</p><p>בהעברה בנקאית יש לציין את תאריך הערך, מספר האסמכתא ופרטי חשבון המעסיק שממנו בוצעה ההעברה.</p><p>שדות 006 משתנים לפי סוג הדיווח: בדיווח שלילי נדרשת סיבת החזר; בדיווח שוטף נדרשים סטטוסי הפקדה ועובד.</p></aside>
        <div className="payment-main">
          <section className="payment-panel"><h3>פרטי חשבון יצרן לזיכוי</h3><div className="payment-provider-grid"><div className="field payment-provider-name"><label>שם יצרן / מוצר *</label><input required maxLength={160} value={form.providerName} onChange={(e) => patch("providerName", e.target.value)} /></div><div className="payment-amount"><span>סכום</span><b>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</b></div><div className="field payment-provider-account"><label>חשבון יצרן לזיכוי *</label><div className="payment-input-icon"><input required maxLength={120} value={form.providerAccount} onChange={(e) => patch("providerAccount", e.target.value)} placeholder="בנק - סניף - חשבון" /><Pencil size={14} /></div></div></div></section>
          <section className="payment-panel"><h3>פרטי אופן תשלום</h3><div className="payment-method-grid"><div className="field payment-method"><label>אופן התשלום *</label><ReferenceOptionSelect category="manual-payment-method" required value={form.paymentMethod} onChange={(value) => patch("paymentMethod", value)} /></div><div className="field"><label>תאריך ערך{bankRequired ? " *" : ""}</label><div className="payment-input-icon"><input required={bankRequired} type="date" value={form.valueDate?.slice(0, 10) || ""} onChange={(e) => patch("valueDate", e.target.value || null)} /><CalendarDays size={14} /></div></div><div className="field"><label>מס׳ אסמכתא{bankRequired ? " *" : ""}</label><input required={bankRequired} maxLength={120} value={form.referenceNumber} onChange={(e) => patch("referenceNumber", e.target.value)} /></div><label className="payment-upload"><FileUp size={15} /><span>{form.confirmationFileName || "צירוף אישור העברה"}</span><input type="file" hidden onChange={(e) => patch("confirmationFileName", e.target.files?.[0]?.name || "")} /></label><div className="field"><label>בנק</label><input maxLength={120} value={form.employerBankName} onChange={(e) => patch("employerBankName", e.target.value)} placeholder="שם הבנק" /></div><div className="field"><label>מס׳ בנק{bankRequired ? " *" : ""}</label><input required={bankRequired} inputMode="numeric" maxLength={4} value={form.employerBankCode} onChange={(e) => patch("employerBankCode", e.target.value.replace(/\D/g, "").slice(0, 4))} /></div><div className="field"><label>סניף{bankRequired ? " *" : ""}</label><input required={bankRequired} inputMode="numeric" maxLength={3} value={form.employerBranch} onChange={(e) => patch("employerBranch", e.target.value.replace(/\D/g, "").slice(0, 3))} /></div><div className="field"><label>מס׳ חשבון{bankRequired ? " *" : ""}</label><input required={bankRequired} inputMode="numeric" maxLength={20} value={form.employerAccount} onChange={(e) => patch("employerAccount", e.target.value.replace(/\D/g, "").slice(0, 20))} /></div></div></section>
          {!differences ? <section className="payment-panel"><h3>שדות ממשק מעסיקים 006</h3>{loadingMetadata ? <div className="empty">טוען נתוני 006...</div> : <div className="payment-method-grid">
            <div className="field"><label>סוג פעולה *</label><EmployerInterfaceOptionSelect category="operation-code" scope={operationScope} value={metadataForm.operationCode} required onChange={(value) => patchMetadata("operationCode", value)} /></div>
            {!negative ? <div className="field"><label>מעמד הפקדה בקופה *</label><EmployerInterfaceOptionSelect category="deposit-status" value={metadataForm.depositStatus} required onChange={(value) => patchMetadata("depositStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>סטטוס עובד בחודש השכר *</label><EmployerInterfaceOptionSelect category="employee-status" value={metadataForm.employeeStatus} required onChange={(value) => patchMetadata("employeeStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>תאריך תחילת סטטוס *</label><input type="date" value={metadataForm.statusStartDate?.slice(0, 10) ?? ""} onChange={(e) => patchMetadata("statusStartDate", e.target.value || null)} /></div> : null}
            {!negative ? <div className="field"><label>הפקדה אחרונה *</label><EmployerInterfaceOptionSelect category="last-deposit" value={metadataForm.lastDeposit} required onChange={(value) => patchMetadata("lastDeposit", value)} /></div> : null}
            {negative ? <div className="field"><label>סיבת בקשה להחזר *</label><EmployerInterfaceOptionSelect category="refund-reason" scope="negative" value={metadataForm.refundReason} required onChange={(value) => patchMetadata("refundReason", value)} /></div> : null}
            <div className="field"><label>קוד אמצעי תשלום 006 *</label><EmployerInterfaceOptionSelect category="payment-method" value={metadataForm.paymentMethodCode} required onChange={(value) => patchMetadata("paymentMethodCode", value)} /></div>
            <div className="field"><label>סוג חשבון מעסיק *</label><EmployerInterfaceOptionSelect category="account-type" value={metadataForm.employerAccountType} required onChange={(value) => patchMetadata("employerAccountType", value)} /></div>
            <div className="field"><label>סוג חשבון קולט *</label><EmployerInterfaceOptionSelect category="account-type" value={metadataForm.receiverAccountType} required onChange={(value) => patchMetadata("receiverAccountType", value)} /></div>
            <div className="field"><label>חלקיות משרה (%)</label><input type="number" min="1" max="100" step="0.01" value={metadataForm.employmentPercentage ?? ""} onChange={(e) => patchMetadata("employmentPercentage", e.target.value === "" ? null : Number(e.target.value))} /></div>
            <div className="field"><label>ימי עבודה בחודש</label><input type="number" min="0" max="31" step="1" value={metadataForm.workDaysInMonth ?? ""} onChange={(e) => patchMetadata("workDaysInMonth", e.target.value === "" ? null : Number(e.target.value))} /></div>
          </div>}</section> : null}
        </div>
      </div>
      <div className="payment-modal-footer"><button className="btn btn-primary" disabled={saving || loadingMetadata} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button><button className="btn btn-secondary" onClick={onClose}>ביטול</button></div>
    </div>
  </div>;
}
