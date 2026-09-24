"use client";

import { UiDateInput, UiInput  } from "@/components/ui-controls";
import { Tooltip } from "@/components/tooltip";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CreditCard, FileUp, Pencil, Search, X } from "lucide-react";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { VirtualizedTable } from "@/components/virtualized-table";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { bankReferenceApi, type BankBranchReference, type BankReference } from "@/lib/bank-reference-api";
import { employerInterfaceApi, type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/lib/employer-interface-api";
import { manualDepositsApi, type ManualDepositRow, type ManualPaymentInput } from "@/lib/manual-deposits-api";
import type { Employer, PensionFundOption, PensionProductType } from "@/lib/types";
import { formatDateDDMMYYYY } from "@/lib/date-format";

const productNames: Record<number, string> = { 1: "קרן פנסיה", 2: "קרן השתלמות", 3: "ביטוח מנהלים", 4: "קופת גמל", 99: "אחר" };
const emptyPreviousReference = (): EmployerInterfacePreviousReference => ({ previousIdentifier: "", previousClearingIdentifier: "", previousReferenceExceptionCode: null });
const shortError = (message: string) => message.trim().replace(/\s+/g, " ").slice(0, 220) + (message.trim().replace(/\s+/g, " ").length > 220 ? "…" : "");

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
    catch (err) { const message = shortError(err instanceof Error ? err.message : "טעינת נתוני ההפקדות נכשלה"); setError(message); notify.error(message); }
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
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--muted)" }}>פרטי התשלום ברמת המוצר.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} תוצאות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><UiInput maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="יצרן, מוצר, עובד או אסמכתא" /></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <div className="empty">טוען נתוני הפקדות...</div> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות בדיווח</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד לדיווח הנוכחי.</span></div> : <VirtualizedTable
      items={rows}
      rowKey={(row) => row.id}
      rowHeight={48}
      maxHeight={560}
      tableClassName="deposit-table"
      wrapperClassName="deposit-table-wrap"
      columns={[{ key: "provider", label: "שם יצרן / מוצר" }, { key: "providerAccount", label: "חשבון יצרן" }, { key: "amount", label: "סכום" }, { key: "employerAccount", label: "חשבון מעסיק" }, { key: "reference", label: "אסמכתא" }, { key: "date", label: "תאריך ערך" }, { key: "type", label: "סוג תקבול" }, { key: "edit", label: "" }]}
      renderCells={(row) => [
        <><b>{row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "מוצר פנסיוני"}</b><span>{row.employeeName} · {row.policyNumber || "ללא מס׳ פוליסה"}</span></>,
        row.providerAccount || "—",
        `₪${Number(row.totalDeposit).toLocaleString("he-IL")}`,
        formatEmployerAccount(row),
        row.referenceNumber || "—",
        row.valueDate ? formatDate(row.valueDate) : "—",
        row.reportingType ? `קוד ${row.reportingType}` : "—",
        <button className="icon-button" aria-label="עריכת פרטי תשלום" onClick={() => setEditing(row)}><Pencil size={17} /></button>,
      ]}
    />}
    {editing ? <DepositPaymentEditor employer={employer} organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing} onClose={() => setEditing(null)} onSaved={(updated) => {
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      notify.success("פרטי התשלום נשמרו בהצלחה");
    }} /> : null}
  </>;
}

function formatEmployerAccount(row: ManualDepositRow) {
  const values = [row.employerBankCode, row.employerBranch, row.employerAccount].filter(Boolean);
  return values.length ? values.join(" - ") : "—";
}
function formatDate(value: string) {
  return formatDateDDMMYYYY(value, value);
}
function emptyMetadata(): EmployerInterfaceProductMetadataInput {
  return { operationCode: null, depositStatus: null, employeeStatus: null, statusStartDate: null, employmentPercentage: null, workDaysInMonth: null, lastDeposit: null, refundReason: null, paymentMethodCode: null, employerAccountType: null, receiverAccountType: null };
}
function isNegativeKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) { return value === 3 || value === "3" || value === "Negative"; }
function isDifferencesKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) { return value === 2 || value === "2" || value === "Differences"; }
function isGuidV4(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim()); }
function requiresPreviousReference(negative: boolean, operationCode: number | null) { return negative ? operationCode === 5 || operationCode === 6 : operationCode === 2 || operationCode === 3 || operationCode === 7; }
function providerAccountFromReference(product: PensionFundOption | null) {
  if (!product?.accountNumber) return "";
  return [product.bankCode, product.branchCode, product.accountNumber].filter((value) => value !== null && value !== undefined && value !== "").join(" - ");
}
function bankLabel(bank: BankReference) { return `${bank.bankCode} - ${bank.bankName}`; }
function branchLabel(branch: BankBranchReference) { return `${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`; }

function validate006Metadata(metadata: EmployerInterfaceProductMetadata | null, form: EmployerInterfaceProductMetadataInput, previous: EmployerInterfacePreviousReference) {
  const errors: string[] = [];
  if (!metadata) return ["נתוני הדיווח עדיין נטענים."];
  if (isDifferencesKind(metadata.reportKind)) return errors;
  const negative = isNegativeKind(metadata.reportKind);
  if (!form.operationCode) errors.push("סוג פעולה הוא שדה חובה.");
  if (!negative) {
    if (!form.depositStatus) errors.push("מעמד הפקדה בקופה הוא שדה חובה בדיווח שוטף.");
    if (!form.employeeStatus) errors.push("סטטוס עובד בחודש השכר הוא שדה חובה בדיווח שוטף.");
    if (!form.statusStartDate) errors.push("תאריך תחילת סטטוס הוא שדה חובה בדיווח שוטף.");
    if (!form.lastDeposit) errors.push("יש לציין האם זו הפקדה אחרונה בדיווח שוטף.");
    if (!form.paymentMethodCode) errors.push("אמצעי תשלום הוא שדה חובה בדיווח שוטף.");
    if (!form.employerAccountType) errors.push("סוג חשבון מעסיק הוא שדה חובה בדיווח שוטף.");
    if (!form.receiverAccountType) errors.push("סוג חשבון קולט תשלום הוא שדה חובה בדיווח שוטף.");
  } else {
    if (!form.refundReason) errors.push("סיבת בקשה להחזר כספים היא שדה חובה בדיווח שלילי.");
    if ((form.operationCode === 5 || form.operationCode === 6) && !form.paymentMethodCode)
      errors.push("יש לבחור קוד אמצעי תשלום בהתאם לסוג הפעולה.");
    if (form.operationCode === 6 && form.paymentMethodCode != null && form.paymentMethodCode !== 1)
      errors.push("בקוד פעולה 6 מותר קוד אמצעי תשלום 1 בלבד לפי טבלת גרסה 6.");
  }
  if (!negative && form.employmentPercentage != null && (form.employmentPercentage < 1 || form.employmentPercentage > 100)) errors.push("חלקיות משרה חייבת להיות בין 1 ל־100.");
  if (!negative && form.workDaysInMonth != null && (form.workDaysInMonth < 0 || form.workDaysInMonth > 31)) errors.push("ימי עבודה בחודש חייבים להיות בין 0 ל־31.");

  if (requiresPreviousReference(negative, form.operationCode)) {
    const hasIdentifier = Boolean(previous.previousIdentifier.trim());
    const hasClearingIdentifier = Boolean(previous.previousClearingIdentifier.trim());
    if (!hasIdentifier && !hasClearingIdentifier && !previous.previousReferenceExceptionCode)
      errors.push("יש לקשר לדיווח המקורי באמצעות מספר זיהוי קודם או מספר מסלקה קודם, או לבחור חריג רשמי.");
    if (hasIdentifier && !isGuidV4(previous.previousIdentifier)) errors.push("מספר זיהוי קודם חייב להיות GUID גרסה 4.");
    if (hasClearingIdentifier && !isGuidV4(previous.previousClearingIdentifier)) errors.push("מספר מסלקה קודם חייב להיות GUID גרסה 4.");
  }
  return errors;
}

function validatePaymentDetails(form: ManualPaymentInput, metadata: EmployerInterfaceProductMetadata | null, meta: EmployerInterfaceProductMetadataInput, totalDeposit: number) {
  const errors: string[] = [];
  if (!form.providerName.trim()) errors.push("לא נמצאו פרטי יצרן למוצר.");
  if (!metadata || isDifferencesKind(metadata.reportKind)) return errors;
  const negative = isNegativeKind(metadata.reportKind);
  const receiverAccountRequired = !negative && ((meta.paymentMethodCode === 1 && totalDeposit > 0) || meta.paymentMethodCode === 7);
  if (receiverAccountRequired && !form.providerAccount.trim()) errors.push("לא נמצא חשבון יצרן לזיכוי בנתוני המוצר.");
  const requireEmployerBank = !negative || (meta.operationCode === 5 && meta.paymentMethodCode === 1);
  if (!negative && !form.referenceNumber.trim()) errors.push("מספר אסמכתא הוא שדה חובה בדיווח שוטף.");
  if (form.referenceNumber.length > 50) errors.push("מספר אסמכתא יכול להכיל עד 50 תווים לפי ממשק 006.");
  if (requireEmployerBank) {
    if (!/^\d+$/.test(form.employerBankCode.trim())) errors.push("יש לבחור בנק.");
    if (!/^\d{1,3}$/.test(form.employerBranch.trim())) errors.push("יש לבחור סניף.");
    if (!/^\d{1,20}$/.test(form.employerAccount.trim())) errors.push("יש להזין מספר חשבון תקין.");
  }
  return errors;
}

function DepositPaymentEditor({ employer, organizationId, employerId, reportId, row, onClose, onSaved }: {
  employer: Employer | null; organizationId: string; employerId: string; reportId: string; row: ManualDepositRow; onClose: () => void; onSaved: (row: ManualDepositRow) => void;
}) {
  const [form, setForm] = useState<ManualPaymentInput>({
    providerName: row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "", providerAccount: row.providerAccount || "", paymentMethod: row.paymentMethod || "",
    valueDate: row.valueDate, referenceNumber: row.referenceNumber || "", employerBankName: row.employerBankName || "", employerBankCode: row.employerBankCode || "",
    employerBranch: row.employerBranch || "", employerAccount: row.employerAccount || "", confirmationFileName: row.confirmationFileName || "",
  });
  const [metadata, setMetadata] = useState<EmployerInterfaceProductMetadata | null>(null);
  const [metadataForm, setMetadataForm] = useState<EmployerInterfaceProductMetadataInput>(emptyMetadata);
  const [previousReference, setPreviousReference] = useState<EmployerInterfacePreviousReference>(emptyPreviousReference);
  const [providerReference, setProviderReference] = useState<PensionFundOption | null>(null);
  const [banks, setBanks] = useState<BankReference[]>([]);
  const [branches, setBranches] = useState<BankBranchReference[]>([]);
  const [bankSelection, setBankSelection] = useState(row.employerBankCode || row.employerBankName ? `${row.employerBankCode}${row.employerBankCode && row.employerBankName ? " - " : ""}${row.employerBankName}` : "");
  const [branchSelection, setBranchSelection] = useState(row.employerBranch || "");
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true; setLoadingMetadata(true);
    Promise.all([
      employerInterfaceApi.productMetadata(organizationId, employerId, reportId, row.id),
      employerInterfaceApi.previousReference(organizationId, employerId, reportId, row.id),
    ]).then(([item, previous]) => {
      if (!active) return;
      setMetadata(item);
      setMetadataForm({ operationCode: item.operationCode, depositStatus: item.depositStatus, employeeStatus: item.employeeStatus, statusStartDate: item.statusStartDate,
        employmentPercentage: item.employmentPercentage, workDaysInMonth: item.workDaysInMonth, lastDeposit: item.lastDeposit, refundReason: item.refundReason,
        paymentMethodCode: item.paymentMethodCode, employerAccountType: item.employerAccountType, receiverAccountType: item.receiverAccountType });
      setPreviousReference(previous);
    }).catch((err) => { if (active) setError(shortError(err instanceof Error ? err.message : "טעינת נתוני הדיווח נכשלה")); })
      .finally(() => { if (active) setLoadingMetadata(false); });
    return () => { active = false; };
  }, [organizationId, employerId, reportId, row.id]);

  useEffect(() => {
    let active = true;
    void bankReferenceApi.banks("", 100).then((items) => { if (active) setBanks(items); }).catch(() => { if (active) setBanks([]); });
    if (row.fundExternalKey) {
      void alphaApi.pensionFunds(row.productType as PensionProductType, row.fundExternalKey, 20).then((items) => {
        if (!active) return;
        const exact = items.find((item) => item.externalKey === row.fundExternalKey) ?? null;
        setProviderReference(exact);
        if (exact) {
          const account = providerAccountFromReference(exact);
          setForm((current) => ({
            ...current,
            providerName: exact.companyName || exact.fundName || current.providerName,
            providerAccount: account || current.providerAccount,
          }));
        }
      }).catch(() => { if (active) setProviderReference(null); });
    }
    return () => { active = false; };
  }, [row.fundExternalKey, row.productType]);

  useEffect(() => {
    const bankCode = Number(form.employerBankCode);
    if (!bankCode) { setBranches([]); return; }
    let active = true;
    void bankReferenceApi.branches(bankCode, "", 200).then((items) => { if (active) setBranches(items); }).catch(() => { if (active) setBranches([]); });
    return () => { active = false; };
  }, [form.employerBankCode]);

  function patch<K extends keyof ManualPaymentInput>(key: K, value: ManualPaymentInput[K]) { setForm((current) => ({ ...current, [key]: value })); setError(""); }
  function patchMetadata<K extends keyof EmployerInterfaceProductMetadataInput>(key: K, value: EmployerInterfaceProductMetadataInput[K]) { setMetadataForm((current) => ({ ...current, [key]: value })); setError(""); }
  function patchPrevious<K extends keyof EmployerInterfacePreviousReference>(key: K, value: EmployerInterfacePreviousReference[K]) { setPreviousReference((current) => ({ ...current, [key]: value })); setError(""); }

  function chooseBank(value: string) {
    setBankSelection(value);
    const bank = banks.find((item) => bankLabel(item) === value || String(item.bankCode) === value || item.bankName === value);
    if (!bank) return;
    setForm((current) => ({ ...current, employerBankName: bank.bankName, employerBankCode: String(bank.bankCode), employerBranch: "" }));
    setBranchSelection("");
    setError("");
  }

  function chooseBranch(value: string) {
    setBranchSelection(value);
    const branch = branches.find((item) => branchLabel(item) === value || String(item.branchCode) === value);
    if (!branch) return;
    patch("employerBranch", String(branch.branchCode));
  }

  const negative = isNegativeKind(metadata?.reportKind);
  const differences = isDifferencesKind(metadata?.reportKind);
  const operationScope = negative ? "negative" : "current";
  const operation5 = negative && metadataForm.operationCode === 5;
  const operation6 = negative && metadataForm.operationCode === 6;
  const needsPrevious = !differences && requiresPreviousReference(negative, metadataForm.operationCode);
  const showOfficialPaymentMethod = !differences && (!negative || operation5 || operation6);
  const bankRequired = !differences && (!negative || (operation5 && metadataForm.paymentMethodCode === 1));

  async function save() {
    setError("");
    const errors = [...validatePaymentDetails(form, metadata, metadataForm, Number(row.totalDeposit)), ...validate006Metadata(metadata, metadataForm, previousReference)];
    if (errors.length) { const message = shortError(errors.join(" ")); setError(message); notify.error(message); return; }
    setSaving(true);
    try {
      const persistedPayment = { ...form, paymentMethod: metadataForm.paymentMethodCode == null ? "" : String(metadataForm.paymentMethodCode) };
      await manualDepositsApi.savePayment(organizationId, employerId, reportId, row.id, persistedPayment);
      if (!differences) {
        await employerInterfaceApi.updateProductMetadata(organizationId, employerId, reportId, row.id, metadataForm);
        await employerInterfaceApi.updatePreviousReference(organizationId, employerId, reportId, row.id, previousReference);
      }
      onSaved({ ...row, ...persistedPayment });
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "שמירת פרטי התשלום נכשלה"); setError(message); notify.error(message); setSaving(false);
    }
  }

  const providerAccount = form.providerAccount || providerAccountFromReference(providerReference);

  return <div className="report-modal-backdrop payment-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="payment-modal" role="dialog" aria-modal="true" aria-label="פרטי תשלום">
      <button className="payment-modal-close" onClick={onClose} aria-label="סגירה"><X size={20} /></button>
      <div className="payment-modal-title">פרטי תשלום</div>
      <div className="payment-employer-chip"><BriefcaseBusiness size={17} /><b>{employer?.legalName || "המעסיק"}</b><span>{employer?.registrationNumber || ""}</span><CreditCard size={15} /></div>
      {error ? <Tooltip content={error} label={error}><div className="notice notice-error payment-error">{error}</div></Tooltip> : null}
      {differences ? <div className="notice notice-info payment-error">בדיווח הפרשים אין צורך להשלים את פרטי הדיווח הנוספים בשלב הזה. הם יושלמו בעת יצירת דיווח שוטף או שלילי המבוסס עליו.</div> : null}
      {operation6 ? <div className="notice notice-info payment-error">בקוד פעולה 6 מדובר בביטול תנועה ללא החזר למעסיק. לפי טבלת גרסה 6 יש לדווח קוד אמצעי תשלום 1, ללא פרטי החזר נוספים.</div> : null}
      <div className="payment-layout">
        <aside className="payment-notes"><b>לתשומת לבך</b><p>פרטי חשבון היצרן נטענים אוטומטית מנתוני המוצר הקיימים במערכת.</p><p>יש לבחור את אמצעי התשלום ואת חשבון המעסיק שממנו בוצע התשלום.</p><p>בפעולות תיקון או ביטול יש לקשר לדיווח המקורי או לציין חריג מתאים כאשר אין קישור.</p></aside>
        <div className="payment-main">
          <section className="payment-panel"><h3>פרטי חשבון יצרן</h3><div className="payment-provider-grid"><div className="field payment-provider-name"><label>שם יצרן / מוצר</label><UiInput readOnly value={form.providerName} /></div><div className="payment-amount"><span>סכום</span><b>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</b></div><div className="field payment-provider-account"><label>חשבון יצרן לזיכוי</label><UiInput readOnly value={providerAccount} placeholder="לא נמצאו פרטי חשבון בנתוני המוצר" /></div></div></section>

          {!differences ? <section className="payment-panel"><h3>{operation6 ? "פרטי פעולה" : negative ? "פרטי החזר" : "פרטי תשלום"}</h3><div className="payment-method-grid">
            {showOfficialPaymentMethod ? <div className="field payment-method"><label>{negative ? "אופן החזר התשלום המבוקש *" : "אמצעי תשלום *"}</label><EmployerInterfaceOptionSelect category="payment-method" operationCode={metadataForm.operationCode} value={metadataForm.paymentMethodCode} required onChange={(value) => patchMetadata("paymentMethodCode", value)} /></div> : null}
            {!negative ? <div className="field"><label>תאריך ערך</label><div className="payment-input-icon"><UiDateInput value={form.valueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("valueDate", value || null)} /><CalendarDays size={14} /></div></div> : null}
            {!negative ? <div className="field"><label>מס׳ אסמכתא *</label><UiInput required maxLength={50} value={form.referenceNumber} onChange={(e) => patch("referenceNumber", e.target.value)} /></div> : null}
            {!operation6 ? <label className="payment-upload"><FileUp size={15} /><span>{form.confirmationFileName || "צירוף אישור"}</span><UiInput type="file" hidden onChange={(e) => patch("confirmationFileName", e.target.files?.[0]?.name || "")} /></label> : null}
            {bankRequired ? <>
              <div className="field"><label>בנק *</label><UiInput required list={`banks-${row.id}`} value={bankSelection} onChange={(e) => chooseBank(e.target.value)} placeholder="חיפוש לפי שם או מספר בנק" /><datalist id={`banks-${row.id}`}>{banks.map((bank) => <option key={bank.bankCode} value={bankLabel(bank)} />)}</datalist></div>
              <div className="field"><label>מס׳ בנק</label><UiInput readOnly value={form.employerBankCode} /></div>
              <div className="field"><label>סניף *</label><UiInput required list={`branches-${row.id}`} value={branchSelection} onChange={(e) => chooseBranch(e.target.value)} placeholder={form.employerBankCode ? "חיפוש סניף" : "יש לבחור בנק תחילה"} disabled={!form.employerBankCode} /><datalist id={`branches-${row.id}`}>{branches.map((branch) => <option key={branch.branchCode} value={branchLabel(branch)} />)}</datalist></div>
              <div className="field"><label>מס׳ חשבון *</label><UiInput required inputMode="numeric" maxLength={20} value={form.employerAccount} onChange={(e) => patch("employerAccount", e.target.value.replace(/\D/g, "").slice(0, 20))} /></div>
            </> : null}
          </div></section> : null}

          {!differences ? <section className="payment-panel"><h3>פרטי דיווח נוספים</h3>{loadingMetadata ? <div className="empty">טוען נתוני דיווח...</div> : <div className="payment-method-grid">
            <div className="field"><label>סוג פעולה *</label><EmployerInterfaceOptionSelect category="operation-code" scope={operationScope} value={metadataForm.operationCode} required onChange={(value) => {
              patchMetadata("operationCode", value);
              if (metadataForm.paymentMethodCode != null) patchMetadata("paymentMethodCode", null);
            }} /></div>
            {!negative ? <div className="field"><label>מעמד הפקדה בקופה *</label><EmployerInterfaceOptionSelect category="deposit-status" value={metadataForm.depositStatus} required onChange={(value) => patchMetadata("depositStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>סטטוס עובד בחודש השכר *</label><EmployerInterfaceOptionSelect category="employee-status" value={metadataForm.employeeStatus} required onChange={(value) => patchMetadata("employeeStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>תאריך תחילת סטטוס *</label><UiDateInput value={metadataForm.statusStartDate?.slice(0, 10) ?? ""} onValueChange={(value) => patchMetadata("statusStartDate", value || null)} /></div> : null}
            {!negative ? <div className="field"><label>הפקדה אחרונה *</label><EmployerInterfaceOptionSelect category="last-deposit" value={metadataForm.lastDeposit} required onChange={(value) => patchMetadata("lastDeposit", value)} /></div> : null}
            {negative ? <div className="field"><label>סיבת בקשה להחזר/ביטול *</label><EmployerInterfaceOptionSelect category="refund-reason" scope="negative" value={metadataForm.refundReason} required onChange={(value) => patchMetadata("refundReason", value)} /></div> : null}
            {!negative ? <div className="field"><label>סוג חשבון מעסיק *</label><EmployerInterfaceOptionSelect category="employer-account-type" scope="current" value={metadataForm.employerAccountType} required onChange={(value) => patchMetadata("employerAccountType", value)} /></div> : null}
            {!negative ? <div className="field"><label>סוג חשבון קולט *</label><EmployerInterfaceOptionSelect category="receiver-account-type" scope="current" value={metadataForm.receiverAccountType} required onChange={(value) => patchMetadata("receiverAccountType", value)} /></div> : null}
            {!negative ? <div className="field"><label>חלקיות משרה (%)</label><UiInput type="number" min="1" max="100" step="0.01" value={metadataForm.employmentPercentage ?? ""} onChange={(e) => patchMetadata("employmentPercentage", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
            {!negative ? <div className="field"><label>ימי עבודה בחודש</label><UiInput type="number" min="0" max="31" step="1" value={metadataForm.workDaysInMonth ?? ""} onChange={(e) => patchMetadata("workDaysInMonth", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
          </div>}</section> : null}

          {needsPrevious ? <section className="payment-panel"><h3>קישור לדיווח המקורי</h3><div className="notice notice-info" style={{ marginBottom: 12 }}>בפעולת תיקון או ביטול יש לקשר לדיווח המקורי. ניתן להזין אחד מהמזהים או לבחור חריג מתאים.</div><div className="payment-method-grid">
            <div className="field"><label>מספר זיהוי קודם (GUID)</label><UiInput maxLength={36} value={previousReference.previousIdentifier} onChange={(e) => patchPrevious("previousIdentifier", e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" /></div>
            <div className="field"><label>מספר מסלקה קודם (GUID)</label><UiInput maxLength={36} value={previousReference.previousClearingIdentifier} onChange={(e) => patchPrevious("previousClearingIdentifier", e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" /></div>
            <div className="field"><label>חריג להיעדר מזהה קודם</label><EmployerInterfaceOptionSelect category="previous-reference-exception" value={previousReference.previousReferenceExceptionCode} onChange={(value) => patchPrevious("previousReferenceExceptionCode", value)} /></div>
          </div></section> : null}
        </div>
      </div>
      <div className="payment-modal-footer"><button className="btn btn-primary" disabled={saving || loadingMetadata} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button><button className="btn btn-secondary" onClick={onClose}>ביטול</button></div>
    </div>
  </div>;
}
