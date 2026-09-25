"use client";

import { UiDateInput, UiInput  } from "@/components/ui-controls";
import { Tooltip } from "@/components/tooltip";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CreditCard, FileUp, Pencil, Search, Trash2, X } from "lucide-react";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { VirtualizedTable } from "@/components/virtualized-table";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { bankReferenceApi, type BankBranchReference, type BankReference } from "@/lib/bank-reference-api";
import { employerInterfaceApi, type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/lib/employer-interface-api";
import { manualDepositsApi, type ManualDepositRow, type ManualPaymentInput } from "@/lib/manual-deposits-api";
import { reportAttachmentsApi, type ReportAttachment } from "@/lib/report-attachments-api";
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
  return { operationCode: null, depositStatus: null, employeeStatus: null, statusStartDate: null, employmentPercentage: null, workDaysInMonth: null, lastDeposit: null, refundReason: null, paymentMethodCode: null, employerAccountType: null, receiverAccountType: null, oldPensionTypeCode: null };
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
    if ((form.operationCode === 2 || form.operationCode === 7) && form.paymentMethodCode !== 1)
      errors.push("בקוד פעולה 2 או 7 יש להשתמש באמצעי תשלום 1.");
    if (form.operationCode === 7 && form.employerAccountType !== 1)
      errors.push("בקוד פעולה 7, כאשר אין העברת כסף, סוג חשבון המעסיק חייב להיות 1.");
  } else {
    if (!form.refundReason) errors.push("סיבת בקשה להחזר כספים היא שדה חובה בדיווח שלילי.");
    if (form.operationCode === 5 && !form.paymentMethodCode)
      errors.push("בקוד פעולה 5 יש לבחור את אופן החזר התשלום המבוקש.");
    if (form.operationCode === 6 && form.paymentMethodCode != null)
      errors.push("בקוד פעולה 6 אין להעביר אמצעי תשלום לפי ממשק מעסיקים 006.");
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
  const noMoneyCorrection = !negative && (meta.operationCode === 2 || meta.operationCode === 7);
  const receiverAccountRequired = !negative && !noMoneyCorrection && ((meta.paymentMethodCode === 1 && totalDeposit > 0) || meta.paymentMethodCode === 7);
  if (receiverAccountRequired && !form.providerAccount.trim()) errors.push("לא נמצא חשבון יצרן לזיכוי בנתוני המוצר.");
  const requireEmployerBank = (!negative && !noMoneyCorrection && (meta.paymentMethodCode === 1 || meta.paymentMethodCode === 7))
    || (meta.operationCode === 5 && meta.paymentMethodCode === 1);
  if (!negative && !noMoneyCorrection && totalDeposit > 0 && (meta.paymentMethodCode === 1 || meta.paymentMethodCode === 3) && !form.referenceNumber.trim())
    errors.push("מספר האסמכתא בפועל הוא שדה חובה באמצעי תשלום זה.");
  if (!negative && !noMoneyCorrection && meta.receiverAccountType === 1 && meta.paymentMethodCode !== 6 && meta.paymentMethodCode !== 9 && !form.valueDate)
    errors.push("תאריך ערך הפקדה לקופה הוא שדה חובה כאשר החשבון הקולט הוא חשבון יצרן.");
  if (!negative && !noMoneyCorrection && meta.employerAccountType === 2 && !form.trustAccountValueDate)
    errors.push("תאריך ערך הפקדה לחשבון נאמנות הוא שדה חובה כאשר סוג חשבון המעסיק הוא חשבון נאמנות.");
  if (!negative && meta.operationCode === 3 && (form.actualDepositAmount == null || form.actualDepositAmount <= 0))
    errors.push("בקוד פעולה 3 יש להזין סכום הפקדה נוספת בפועל הגדול מאפס.");
  if (!negative && meta.paymentMethodCode === 7 && !/^.{8,16}$/.test(form.masavSenderCode.trim()))
    errors.push("בסליקה באמצעות מס״ב יש להזין קוד מס״ב פנימי באורך 8–16 תווים.");
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
    valueDate: row.valueDate, trustAccountValueDate: row.trustAccountValueDate,
    actualDepositAmount: row.actualDepositAmount, masavSenderCode: row.masavSenderCode || "",
    referenceNumber: row.referenceNumber || "", employerBankName: row.employerBankName || "", employerBankCode: row.employerBankCode || "",
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
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [annualEmployerAffidavitSatisfied, setAnnualEmployerAffidavitSatisfied] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true; setLoadingMetadata(true);
    Promise.all([
      employerInterfaceApi.productMetadata(organizationId, employerId, reportId, row.id),
      employerInterfaceApi.previousReference(organizationId, employerId, reportId, row.id),
      reportAttachmentsApi.list(organizationId, employerId, reportId),
    ]).then(([item, previous, attachmentList]) => {
      if (!active) return;
      setMetadata(item);
      setMetadataForm({ operationCode: item.operationCode, depositStatus: item.depositStatus, employeeStatus: item.employeeStatus, statusStartDate: item.statusStartDate,
        employmentPercentage: item.employmentPercentage, workDaysInMonth: item.workDaysInMonth, lastDeposit: item.lastDeposit, refundReason: item.refundReason,
        paymentMethodCode: item.paymentMethodCode, employerAccountType: item.employerAccountType, receiverAccountType: item.receiverAccountType,
        oldPensionTypeCode: item.oldPensionTypeCode });
      setPreviousReference(previous);
      setAttachments(attachmentList.items);
      setAnnualEmployerAffidavitSatisfied(attachmentList.annualEmployerAffidavitSatisfied);
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
  const noMoneyCorrection = !negative && (metadataForm.operationCode === 2 || metadataForm.operationCode === 7);
  const needsPrevious = !differences && requiresPreviousReference(negative, metadataForm.operationCode);
  const showOfficialPaymentMethod = !differences && (!negative || operation5);
  const isOldPensionFund = row.productType === 1 && (row.fundClassification || "").includes("ותיק");
  const bankRequired = !differences && ((!negative && !noMoneyCorrection && (metadataForm.paymentMethodCode === 1 || metadataForm.paymentMethodCode === 7))
    || (operation5 && metadataForm.paymentMethodCode === 1));
  const reportAffidavit = attachments.find((item) => item.documentTypeCode === 3 && item.reportProductId == null) ?? null;
  const employeeApproval = attachments.find((item) => item.documentTypeCode === 4 && item.reportProductId === row.id) ?? null;
  const collectiveAgreementDeclaration = attachments.find((item) => item.documentTypeCode === 6 && item.reportProductId === row.id) ?? null;
  const defaultFundJoinRequest = attachments.find((item) => item.documentTypeCode === 5 && item.reportProductId === row.id) ?? null;

  async function refreshAttachments() {
    const list = await reportAttachmentsApi.list(organizationId, employerId, reportId);
    setAttachments(list.items);
    setAnnualEmployerAffidavitSatisfied(list.annualEmployerAffidavitSatisfied);
  }

  async function uploadAttachment(documentTypeCode: 3 | 4 | 5 | 6, file: File | null) {
    if (!file) return;
    setError("");
    setUploadingAttachment(documentTypeCode);
    try {
      await reportAttachmentsApi.upload(organizationId, employerId, reportId, documentTypeCode, file,
        documentTypeCode === 3 ? null : row.id);
      await refreshAttachments();
      notify.success("המסמך צורף לדיווח.");
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "צירוף המסמך נכשל");
      setError(message); notify.error(message);
    } finally {
      setUploadingAttachment(null);
    }
  }

  async function removeAttachment(attachmentId: string) {
    setError("");
    try {
      await reportAttachmentsApi.remove(organizationId, employerId, reportId, attachmentId);
      await refreshAttachments();
      notify.success("המסמך הוסר מהדיווח.");
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "מחיקת המסמך נכשלה");
      setError(message); notify.error(message);
    }
  }

  async function save() {
    setError("");
    const errors = [...validatePaymentDetails(form, metadata, metadataForm, Number(row.totalDeposit)), ...validate006Metadata(metadata, metadataForm, previousReference)];
    if (!negative && isOldPensionFund && !metadataForm.oldPensionTypeCode)
      errors.push("בקרן פנסיה ותיקה יש לבחור סוג פנסיה: מקיפה או יסוד.");
    if (!negative && isOldPensionFund && metadataForm.employmentPercentage == null && metadataForm.workDaysInMonth == null)
      errors.push("בקרן פנסיה ותיקה יש להזין חלקיות משרה או ימי עבודה בחודש.");
    if (operation5 && !annualEmployerAffidavitSatisfied)
      errors.push("בקוד פעולה 5 נדרש תצהיר מעסיק שנתי (סוג מסמך 3) לפחות פעם אחת בשנה.");
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
      {operation6 ? <div className="notice notice-info payment-error">בקוד פעולה 6 מדובר בביטול תנועה ללא החזר למעסיק, ולכן אין להעביר ערך בשדה אמצעי התשלום.</div> : null}
      <div className="payment-layout">
        <aside className="payment-notes"><b>לתשומת לבך</b><p>פרטי חשבון היצרן נטענים אוטומטית מנתוני המוצר הקיימים במערכת.</p><p>יש לבחור את אמצעי התשלום ואת חשבון המעסיק שממנו בוצע התשלום.</p><p>בפעולות תיקון או ביטול יש לקשר לדיווח המקורי או לציין חריג מתאים כאשר אין קישור.</p></aside>
        <div className="payment-main">
          <section className="payment-panel"><h3>פרטי חשבון יצרן</h3><div className="payment-provider-grid"><div className="field payment-provider-name"><label>שם יצרן / מוצר</label><UiInput readOnly value={form.providerName} /></div><div className="payment-amount"><span>סכום</span><b>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</b></div><div className="field payment-provider-account"><label>חשבון יצרן לזיכוי</label><UiInput readOnly value={providerAccount} placeholder="לא נמצאו פרטי חשבון בנתוני המוצר" /></div></div></section>

          {!differences ? <section className="payment-panel"><h3>{operation6 ? "פרטי פעולה" : negative ? "פרטי החזר" : "פרטי תשלום"}</h3><div className="payment-method-grid">
            {showOfficialPaymentMethod ? <div className="field payment-method"><label>{negative ? "אופן החזר התשלום המבוקש *" : "אמצעי תשלום *"}</label><EmployerInterfaceOptionSelect category="payment-method" operationCode={metadataForm.operationCode} value={metadataForm.paymentMethodCode} required onChange={(value) => patchMetadata("paymentMethodCode", value)} /></div> : null}
            {!negative && !noMoneyCorrection && metadataForm.receiverAccountType === 1 && metadataForm.paymentMethodCode !== 6 && metadataForm.paymentMethodCode !== 9 ? <div className="field"><label>תאריך ערך הפקדה לקופה *</label><div className="payment-input-icon"><UiDateInput value={form.valueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("valueDate", value || null)} /><CalendarDays size={14} /></div></div> : null}
            {!negative && metadataForm.operationCode === 3 ? <div className="field"><label>סכום הפקדה נוספת בפועל *</label><UiInput type="number" min="0" step="0.01" value={form.actualDepositAmount ?? ""} onChange={(e) => patch("actualDepositAmount", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
            {!negative && metadataForm.paymentMethodCode === 7 ? <div className="field"><label>קוד פנימי של הגורם השולח במס״ב *</label><UiInput maxLength={16} value={form.masavSenderCode} onChange={(e) => patch("masavSenderCode", e.target.value)} placeholder="8–16 תווים" /></div> : null}
            {!negative && !noMoneyCorrection && metadataForm.employerAccountType === 2 ? <div className="field"><label>תאריך ערך הפקדה לחשבון נאמנות *</label><div className="payment-input-icon"><UiDateInput value={form.trustAccountValueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("trustAccountValueDate", value || null)} /><CalendarDays size={14} /></div></div> : null}
            {!negative && !noMoneyCorrection && (metadataForm.paymentMethodCode === 1 || metadataForm.paymentMethodCode === 3) ? <div className="field"><label>מס׳ אסמכתא *</label><UiInput required maxLength={50} value={form.referenceNumber} onChange={(e) => patch("referenceNumber", e.target.value)} /></div> : null}
            {!negative ? <label className="payment-upload"><FileUp size={15} /><span>{form.confirmationFileName || "צירוף אישור"}</span><UiInput type="file" hidden onChange={(e) => patch("confirmationFileName", e.target.files?.[0]?.name || "")} /></label> : null}
            {bankRequired ? <>
              <div className="field"><label>בנק *</label><UiInput required list={`banks-${row.id}`} value={bankSelection} onChange={(e) => chooseBank(e.target.value)} placeholder="חיפוש לפי שם או מספר בנק" /><datalist id={`banks-${row.id}`}>{banks.map((bank) => <option key={bank.bankCode} value={bankLabel(bank)} />)}</datalist></div>
              <div className="field"><label>מס׳ בנק</label><UiInput readOnly value={form.employerBankCode} /></div>
              <div className="field"><label>סניף *</label><UiInput required list={`branches-${row.id}`} value={branchSelection} onChange={(e) => chooseBranch(e.target.value)} placeholder={form.employerBankCode ? "חיפוש סניף" : "יש לבחור בנק תחילה"} disabled={!form.employerBankCode} /><datalist id={`branches-${row.id}`}>{branches.map((branch) => <option key={branch.branchCode} value={branchLabel(branch)} />)}</datalist></div>
              <div className="field"><label>מס׳ חשבון *</label><UiInput required inputMode="numeric" maxLength={20} value={form.employerAccount} onChange={(e) => patch("employerAccount", e.target.value.replace(/\D/g, "").slice(0, 20))} /></div>
            </> : null}
          </div></section> : null}

          {!differences ? <section className="payment-panel"><h3>פרטי דיווח נוספים</h3>{loadingMetadata ? <div className="empty">טוען נתוני דיווח...</div> : <div className="payment-method-grid">
            <div className="field"><label>סוג פעולה *</label><EmployerInterfaceOptionSelect category="operation-code" scope={operationScope} value={metadataForm.operationCode} required onChange={(value) => {
              setMetadataForm((current) => {
                if (!negative && value === 2)
                  return { ...current, operationCode: value, paymentMethodCode: 1 };
                if (!negative && value === 7)
                  return { ...current, operationCode: value, paymentMethodCode: 1, employerAccountType: 1 };
                if (negative && value === 6)
                  return { ...current, operationCode: value, paymentMethodCode: null };
                return { ...current, operationCode: value, paymentMethodCode: null };
              });
              if (!negative && (value === 2 || value === 7))
                setForm((current) => ({ ...current, valueDate: null, trustAccountValueDate: null, referenceNumber: "", employerBankCode: "", employerBankName: "", employerBranch: "", employerAccount: "" }));
            }} /></div>
            {!negative ? <div className="field"><label>מעמד הפקדה בקופה *</label><EmployerInterfaceOptionSelect category="deposit-status" value={metadataForm.depositStatus} required onChange={(value) => patchMetadata("depositStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>סטטוס עובד בחודש השכר *</label><EmployerInterfaceOptionSelect category="employee-status" value={metadataForm.employeeStatus} required onChange={(value) => patchMetadata("employeeStatus", value)} /></div> : null}
            {!negative ? <div className="field"><label>תאריך תחילת סטטוס *</label><UiDateInput value={metadataForm.statusStartDate?.slice(0, 10) ?? ""} onValueChange={(value) => patchMetadata("statusStartDate", value || null)} /></div> : null}
            {!negative ? <div className="field"><label>הפקדה אחרונה *</label><EmployerInterfaceOptionSelect category="last-deposit" value={metadataForm.lastDeposit} required onChange={(value) => patchMetadata("lastDeposit", value)} /></div> : null}
            {negative ? <div className="field"><label>סיבת בקשה להחזר/ביטול *</label><EmployerInterfaceOptionSelect category="refund-reason" scope="negative" value={metadataForm.refundReason} required onChange={(value) => patchMetadata("refundReason", value)} /></div> : null}
            {!negative ? <div className="field"><label>סוג חשבון מעסיק *</label><EmployerInterfaceOptionSelect category="employer-account-type" scope="current" value={metadataForm.employerAccountType} required onChange={(value) => patchMetadata("employerAccountType", value)} /></div> : null}
            {!negative ? <div className="field"><label>סוג חשבון קולט *</label><EmployerInterfaceOptionSelect category="receiver-account-type" scope="current" value={metadataForm.receiverAccountType} required onChange={(value) => patchMetadata("receiverAccountType", value)} /></div> : null}
            {!negative && isOldPensionFund ? <div className="field"><label>סוג פנסיה בקרן ותיקה *</label><EmployerInterfaceOptionSelect category="old-pension-type" scope="current" value={metadataForm.oldPensionTypeCode} required onChange={(value) => patchMetadata("oldPensionTypeCode", value)} /></div> : null}
            {!negative ? <div className="field"><label>חלקיות משרה (%)</label><UiInput type="number" min="1" max="100" step="0.01" value={metadataForm.employmentPercentage ?? ""} onChange={(e) => patchMetadata("employmentPercentage", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
            {!negative ? <div className="field"><label>ימי עבודה בחודש</label><UiInput type="number" min="0" max="31" step="1" value={metadataForm.workDaysInMonth ?? ""} onChange={(e) => patchMetadata("workDaysInMonth", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
          </div>}</section> : null}

          {!negative && !differences && row.productType === 1 ? <section className="payment-panel">
            <h3>מסמך הצטרפות לקרן ברירת מחדל</h3>
            <div className="notice notice-info" style={{ marginBottom: 12 }}>
              סוג מסמך 5 מיועד לעובד קיים שמבקש להצטרף לקרן ברירת מחדל. יש לצרף אותו רק כאשר הוא רלוונטי למקרה.
            </div>
            {metadataForm.employeeStatus === 14 ? <div className="notice notice-error" style={{ marginBottom: 12 }}>לעובד חדש (סטטוס 14) אין לצרף מסמך מסוג 5. אם כבר צורף מסמך, יש להסיר אותו לפני האימות הסופי.</div> : null}
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div><b>בקשת עובד להצטרפות לקרן ברירת מחדל</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{defaultFundJoinRequest ? defaultFundJoinRequest.originalFileName : "לעובד/מוצר זה"}</div></div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {defaultFundJoinRequest ? <button type="button" className="btn btn-secondary" onClick={() => void removeAttachment(defaultFundJoinRequest.id)}><Trash2 size={14} />הסר</button> : null}
                {!defaultFundJoinRequest && metadataForm.employeeStatus !== 14 ? <label className="btn btn-secondary" style={{ cursor: uploadingAttachment ? "not-allowed" : "pointer" }}>
                  <FileUp size={14} />{uploadingAttachment === 5 ? "מעלה..." : "צרף PDF"}
                  <UiInput type="file" hidden accept="application/pdf,.pdf" disabled={uploadingAttachment != null}
                    onChange={(e) => { const file = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void uploadAttachment(5, file); }} />
                </label> : null}
              </div>
            </div>
          </section> : null}

          {operation5 ? <section className="payment-panel">
            <h3>מסמכים מצורפים לדיווח השלילי</h3>
            <div className="notice notice-info" style={{ marginBottom: 12 }}>
              בקוד פעולה 5 נדרש תצהיר מעסיק מסוג 3 לפחות פעם אחת בשנה. אישור עובד (4) או הצהרת הסכם קיבוצי (6) מצורפים רק כאשר הם רלוונטיים למקרה.
              המסמכים נשמרים כ-PDF ומצורפים לחבילת השידור לצד ה-XML.
            </div>
            {annualEmployerAffidavitSatisfied && !reportAffidavit ? <div className="notice notice-success" style={{ marginBottom: 12 }}>תצהיר המעסיק השנתי כבר הועבר בדיווח קודם השנה.</div> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {([
                { code: 3 as const, label: "תצהיר מעסיק", item: reportAffidavit, scope: "שנתי ברמת הדיווח" },
                { code: 4 as const, label: "אישור עובד להשבת כספים", item: employeeApproval, scope: "לעובד/מוצר זה" },
                { code: 6 as const, label: "הצהרת מעסיק - הסכם קיבוצי", item: collectiveAgreementDeclaration, scope: "לעובד/מוצר זה" },
              ]).map(({ code, label, item, scope }) => <div key={code} style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div><b>{label}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{scope}{item ? ` · ${item.originalFileName}` : ""}</div></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {item ? <button type="button" className="btn btn-secondary" onClick={() => void removeAttachment(item.id)}><Trash2 size={14} />הסר</button> : null}
                  {!item ? <label className="btn btn-secondary" style={{ cursor: uploadingAttachment ? "not-allowed" : "pointer" }}>
                    <FileUp size={14} />{uploadingAttachment === code ? "מעלה..." : "צרף PDF"}
                    <UiInput type="file" hidden accept="application/pdf,.pdf" disabled={uploadingAttachment != null}
                      onChange={(e) => { const file = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void uploadAttachment(code, file); }} />
                  </label> : null}
                </div>
              </div>)}
            </div>
          </section> : null}

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
