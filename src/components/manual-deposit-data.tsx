"use client";

import { UiAutocomplete, UiDateInput, UiInput } from "@/components/ui-controls";
import { UiFileUpload } from "@/components/ui-file-upload";
import { Tooltip } from "@/components/tooltip";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CreditCard, Download, FileText, Pencil, Search, Trash2 } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { DataTable } from "@/components/data-table";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { bankReferenceApi, type BankBranchReference, type BankReference } from "@/lib/bank-reference-api";
import { employerInterfaceApi, type EmployerInterfaceOption, type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/lib/employer-interface-api";
import { manualDepositsApi, type ManualDepositRow, type ManualPaymentInput } from "@/lib/manual-deposits-api";
import { reportAttachmentsApi, type ReportAttachment } from "@/lib/report-attachments-api";
import { paymentConfirmationsApi, type PaymentConfirmation } from "@/lib/payment-confirmations-api";
import type { Employer, PensionFundOption, PensionProductType } from "@/lib/types";
import { formatDateDDMMYYYY } from "@/lib/date-format";

const receiptTypeFallback: Record<number, string> = {
  1: "שוטף", 2: "חד־פעמי", 4: "הפרשים",
  6: "השלמת פיצויים עד השכר המבוטח כפול הוותק",
  8: "הפקדה לפיצויים מעל השכר המבוטח כפול הוותק",
};
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
  const [paymentAccount, setPaymentAccount] = useState<{ bankId: number; branchId: number; maskedAccountNumber: string } | null>(null);
  const [receiptLabels, setReceiptLabels] = useState<Record<number, string>>(receiptTypeFallback);
  const [proofs, setProofs] = useState<Record<string, PaymentConfirmation[]>>({});
  const [downloadingEvidence, setDownloadingEvidence] = useState<string | null>(null);

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
    employerInterfaceApi.options("receipt-type").then((items) => {
      setReceiptLabels((previous) => Object.fromEntries([
        ...Object.entries(previous).map(([code, label]) => [Number(code), label] as const),
        ...items.filter((item) => item.name && !/^קוד\s+\d+$/.test(item.name))
          .map((item) => [item.code, item.name] as const),
      ]));
    }).catch(() => { /* authoritative labels remain available as local offline fallback */ });
    alphaApi.employerPaymentResolution(organizationId, employerId).then((resolution) => {
      const account = resolution.account;
      setPaymentAccount(account ? { bankId: account.bankId, branchId: account.branchId, maskedAccountNumber: account.maskedAccountNumber } : null);
    }).catch(() => setPaymentAccount(null));
    paymentConfirmationsApi.listForReport(organizationId, employerId, reportId)
      .then((items) => setProofs(items.reduce<Record<string, PaymentConfirmation[]>>((groups, item) => {
        (groups[item.reportProductId] ??= []).push(item);
        return groups;
      }, {})))
      .catch(() => setProofs({}));
  }, [organizationId, employerId, reportId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalDeposit || 0), 0), [rows]);
  async function downloadProof(productId: string, item: PaymentConfirmation) {
    setDownloadingEvidence(item.id);
    try { await paymentConfirmationsApi.download(organizationId, employerId, reportId, productId, item); }
    catch { notify.error("הורדת האסמכתא נכשלה."); }
    finally { setDownloadingEvidence(null); }
  }

  return <>
    <div className="card-head deposit-head">
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--muted)" }}>פרטי התשלום ברמת המוצר.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} תוצאות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><UiInput maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="יצרן, מוצר, עובד או אסמכתא" /></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <div className="empty">טוען נתוני הפקדות...</div> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות בדיווח</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד לדיווח הנוכחי.</span></div> : <DataTable
      items={rows}
      rowKey={(row) => row.id}
      rowHeight={56}
      maxHeight={560}
      minTableWidth={1080}
      columns={[
        { key: "employee", label: "עובד", width: "11%" },
        { key: "provider", label: "שם יצרן / מוצר", width: "17%" },
        { key: "providerAccount", label: "חשבון יצרן", width: "9%" },
        { key: "amount", label: "סכום", width: "8%" },
        { key: "employerAccount", label: "חשבון מעסיק", width: "11%" },
        { key: "reference", label: "אסמכתא", width: "8%" },
        { key: "date", label: "תאריך ערך", width: "8%" },
        { key: "type", label: "סוג תקבול", width: "10%" },
        { key: "status", label: "סטטוס", width: "7%" },
        { key: "files", label: "קבצים", width: "5%" },
        { key: "edit", label: "", width: "6%" },
      ]}
      renderCells={(row) => [
        <b>{row.employeeName}</b>,
        <span title={[row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "מוצר פנסיוני", row.policyNumber || ""].filter(Boolean).join(" · ")}>{row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "מוצר פנסיוני"}</span>,
        <span className="account-number">{row.providerAccount || "—"}</span>,
        `₪${Number(row.totalDeposit).toLocaleString("he-IL")}`,
        <span className="account-number">{formatEmployerAccount(row, paymentAccount)}</span>,
        row.referenceNumber || "—",
        row.valueDate ? formatDate(row.valueDate) : "—",
        row.reportingType ? (receiptLabels[Number(row.reportingType)] ?? `סוג תקבול לא מוכר (${row.reportingType})`) : "—",
        <span className={`badge ${row.requiresCompletion ? "badge-yellow" : "badge-green"}`}>{row.requiresCompletion ? "דורש השלמה" : "מוכן"}</span>,
        proofs[row.id]?.length
          ? <button type="button" className="icon-button deposit-proof-icon"
              title={`הורדת ${proofs[row.id][0].originalFileName}`}
              aria-label={`הורדת ${proofs[row.id][0].originalFileName}`}
              disabled={downloadingEvidence === proofs[row.id][0].id}
              onClick={() => void downloadProof(row.id, proofs[row.id][0])}>
              <FileText size={17} />
            </button>
          : <span className="deposit-proof-empty">-</span>,
        <button className="icon-button deposit-edit-icon" aria-label="עריכת פרטי תשלום" onClick={() => setEditing(row)}><Pencil size={17} /></button>,
      ]}
    />}
    {editing ? <DepositPaymentEditor employer={employer} organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing}
      onEvidenceChanged={(items) => setProofs((current) => ({ ...current, [editing.id]: items }))}
      onClose={() => setEditing(null)} onSaved={(updated) => {
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      notify.success("פרטי התשלום נשמרו בהצלחה");
    }} /> : null}
  </>;
}

function formatEmployerAccount(row: ManualDepositRow, resolved: { bankId: number; branchId: number; maskedAccountNumber: string } | null) {
  const values = [row.employerBankCode, row.employerBranch, row.employerAccount].filter(Boolean);
  const meaningful = values.some((value) => !/^0+$/.test(String(value)));
  if (meaningful && values.length === 3) return values.join(" - ");
  if (resolved) return formatAccount(resolved.bankId, resolved.branchId, resolved.maskedAccountNumber);
  return meaningful ? values.join(" - ") : "—";
}
function formatAccount(bank: string | number, branch: string | number, account: string) {
  return `${bank} - ${branch} - ${account}`;
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
function autocompleteLookupTerm(value: string) {
  const trimmed = value.trim();
  const selectedCode = trimmed.match(/^(\d+)\s*(?:-|·)/);
  return selectedCode?.[1] ?? trimmed;
}

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
    if (form.paymentMethodCode === 9 && (form.employerAccountType !== 1 || form.receiverAccountType !== 1))
      errors.push("באמצעי תשלום 9 סוג חשבון המעסיק וסוג החשבון הקולט חייבים להיות 1.");
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
  if (!negative && !noMoneyCorrection
    && (meta.employerAccountType === 2 || meta.receiverAccountType === 2)
    && !form.trustAccountValueDate)
    errors.push("תאריך ערך הפקדה לחשבון נאמנות הוא שדה חובה בכל העברה אל חשבון נאמנות או ממנו.");
  if (!negative && meta.operationCode === 7 && Math.abs(totalDeposit) > 0.0001)
    errors.push("בקוד פעולה 7 מתקנים תשלומים פטורים בלבד; סכום ההפרשה הרגיל חייב להיות 0.");
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

export function DepositPaymentEditor({ employer, organizationId, employerId, reportId, row, onClose, onSaved, onEvidenceChanged, readOnly = false }: {
  employer: Employer | null; organizationId: string; employerId: string; reportId: string; row: ManualDepositRow;
  onClose: () => void; onSaved: (row: ManualDepositRow) => void; onEvidenceChanged: (items: PaymentConfirmation[]) => void;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<ManualPaymentInput>({
    providerName: row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "", providerAccount: row.providerAccount || "", paymentMethod: row.paymentMethod || "",
    valueDate: row.valueDate, trustAccountValueDate: row.trustAccountValueDate,
    actualDepositAmount: row.actualDepositAmount, masavSenderCode: row.masavSenderCode || "",
    referenceNumber: row.referenceNumber || "", employerBankName: row.employerBankName || "", employerBankCode: row.employerBankCode || "",
    employerBranch: row.employerBranch || "", employerAccount: row.employerAccount || "", confirmationFileName: row.confirmationFileName || "",
    correctionOperationCode: row.correctionOperationCode ?? null,
  });
  const [correctionOperationCode, setCorrectionOperationCode] = useState<2 | 3>(row.correctionOperationCode === 3 ? 3 : 2);
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
  const [paymentProofs, setPaymentProofs] = useState<PaymentConfirmation[]>([]);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [annualEmployerAffidavitSatisfied, setAnnualEmployerAffidavitSatisfied] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resolvedPaymentAccount, setResolvedPaymentAccount] = useState<{ bankId: number; branchId: number; maskedAccountNumber: string; mandateIsActive: boolean } | null>(null);
  const [editorOptions, setEditorOptions] = useState<Record<string, EmployerInterfaceOption[]>>({});
  const [editorOptionsLoading, setEditorOptionsLoading] = useState(true);
  const [editorOptionsError, setEditorOptionsError] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  const optionsFor = (category: string, scope = "all") =>
    (editorOptions[category] ?? []).filter((item) => item.scope === "all" || item.scope === scope);

  useEffect(() => {
    let active = true; setLoadingMetadata(true);
    Promise.all([
      employerInterfaceApi.productMetadata(organizationId, employerId, reportId, row.id),
      employerInterfaceApi.previousReference(organizationId, employerId, reportId, row.id),
      reportAttachmentsApi.list(organizationId, employerId, reportId),
      paymentConfirmationsApi.list(organizationId, employerId, reportId, row.id),
      alphaApi.employerPaymentResolution(organizationId, employerId),
      employerInterfaceApi.optionsBundle(["operation-code", "old-pension-type", "refund-reason", "previous-reference-exception"]),
    ]).then(([item, previous, attachmentList, proofList, paymentResolution, bundledOptions]) => {
      if (!active) return;
      setMetadata(item);
      const automaticDebit = !readOnly && !isNegativeKind(item.reportKind) && !isDifferencesKind(item.reportKind)
        && paymentResolution.account?.mandateIsActive === true
        && item.operationCode !== 2 && item.operationCode !== 7;
      setMetadataForm({ operationCode: item.operationCode, depositStatus: item.depositStatus, employeeStatus: item.employeeStatus, statusStartDate: item.statusStartDate,
        employmentPercentage: item.employmentPercentage, workDaysInMonth: item.workDaysInMonth, lastDeposit: item.lastDeposit, refundReason: item.refundReason,
        paymentMethodCode: automaticDebit ? 6 : item.paymentMethodCode, employerAccountType: automaticDebit ? 1 : item.employerAccountType,
        receiverAccountType: automaticDebit ? 1 : item.receiverAccountType, oldPensionTypeCode: item.oldPensionTypeCode });
      setPreviousReference(previous);
      setAttachments(attachmentList.items);
      setPaymentProofs(proofList); onEvidenceChanged(proofList);
      setAnnualEmployerAffidavitSatisfied(attachmentList.annualEmployerAffidavitSatisfied);
      setEditorOptions(bundledOptions);
      setEditorOptionsError("");
      setEditorOptionsLoading(false);
      const effectiveAccount = paymentResolution.account;
      setResolvedPaymentAccount(effectiveAccount ? { bankId: effectiveAccount.bankId, branchId: effectiveAccount.branchId, maskedAccountNumber: effectiveAccount.maskedAccountNumber, mandateIsActive: effectiveAccount.mandateIsActive } : null);
      if (automaticDebit && effectiveAccount) {
        // Resolution returns the actual authorized account value from encrypted DB
        // (the DTO field is historically named "maskedAccountNumber").
        // Existing non-zero report values always take precedence over account defaults.
        setForm((current) => ({
          ...current, paymentMethod: "6",
          employerBankCode: current.employerBankCode && !/^0+$/.test(current.employerBankCode)
            ? current.employerBankCode : String(effectiveAccount.bankId),
          employerBranch: current.employerBranch && !/^0+$/.test(current.employerBranch)
            ? current.employerBranch : String(effectiveAccount.branchId),
          employerAccount: current.employerAccount && !/^0+$/.test(current.employerAccount)
            ? current.employerAccount : /^\d+$/.test(effectiveAccount.maskedAccountNumber)
              ? effectiveAccount.maskedAccountNumber : "",
        }));
      }

    }).catch((err) => {
      if (active) {
        const message = shortError(err instanceof Error ? err.message : "טעינת נתוני הדיווח נכשלה");
        setError(message);
        setEditorOptionsError(message);
        setEditorOptionsLoading(false);
      }
    })
      .finally(() => { if (active) setLoadingMetadata(false); });
    return () => { active = false; };
  }, [organizationId, employerId, reportId, row.id]);

  useEffect(() => {
    let active = true;
    if (row.fundExternalKey && !row.providerAccount) {
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
    if (!bankOpen) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void bankReferenceApi.banks(autocompleteLookupTerm(bankSelection), 100)
        .then((items) => { if (active) setBanks(items); })
        .catch(() => { if (active) setBanks([]); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [bankOpen, bankSelection]);

  useEffect(() => {
    const bankCode = Number(form.employerBankCode);
    if (!branchOpen || !bankCode) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void bankReferenceApi.branches(bankCode, autocompleteLookupTerm(branchSelection), 200)
        .then((items) => { if (active) setBranches(items); })
        .catch(() => { if (active) setBranches([]); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [branchOpen, branchSelection, form.employerBankCode]);

  // Bank/branch option lists arrive after the payment account. Upgrade a numeric
  // selection to its full human-readable label without replacing user-typed searches.
  useEffect(() => {
    const code = Number(form.employerBankCode);
    const matching = banks.find((bank) => bank.bankCode === code);
    if (!matching) return;
    setBankSelection((current) =>
      !current || current.trim() === String(code) ||
      current.trim() === `${code} -` ||
      (current.startsWith(`${code} -`) && !current.slice(`${code} -`.length).trim())
        ? bankLabel(matching) : current);
  }, [banks, form.employerBankCode]);

  useEffect(() => {
    const code = Number(form.employerBranch);
    const matching = branches.find((branch) => branch.branchCode === code);
    if (!matching) return;
    setBranchSelection((current) =>
      !current || current.trim() === String(code) ||
      current.trim() === `${code} -`
        ? branchLabel(matching) : current);
  }, [branches, form.employerBranch]);

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
  const correctionWorkspace = row.isCorrectionWorkspace === true;
  const addedCorrectionProduct = correctionWorkspace && !row.sourceReportProductId;
  const differences = isDifferencesKind(metadata?.reportKind) && !addedCorrectionProduct;
  const operationScope = negative ? "negative" : "current";
  const operation5 = negative && metadataForm.operationCode === 5;
  const operation6 = negative && metadataForm.operationCode === 6;
  const noMoneyCorrection = !negative && (metadataForm.operationCode === 2 || metadataForm.operationCode === 7);
  const correctionNoMoney = correctionWorkspace && !addedCorrectionProduct && correctionOperationCode === 2;
  const effectiveNoMoneyCorrection = noMoneyCorrection || correctionNoMoney;
  const needsPrevious = !differences && requiresPreviousReference(negative, metadataForm.operationCode);
  const configuredPensionDebit = !negative && !differences && resolvedPaymentAccount?.mandateIsActive === true
    && !noMoneyCorrection && metadataForm.paymentMethodCode === 6;
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
    if (readOnly || !file) return;
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
    if (readOnly) return;
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

  async function uploadPaymentProof(file: File) {
    if (readOnly) return;
    setUploadingProof(true); setError("");
    try {
      const saved = await paymentConfirmationsApi.upload(organizationId, employerId, reportId, row.id, file);
      setPaymentProofs((current) => {
        const next = [saved, ...current];
        onEvidenceChanged(next);
        return next;
      });
      patch("confirmationFileName", saved.originalFileName);
      notify.success("אישור ההעברה הועלה ונשמר.");
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "שמירת האסמכתא נכשלה");
      setError(message); notify.error(message);
    } finally { setUploadingProof(false); }
  }

  async function save() {
    if (readOnly) return;
    setError("");
    const errors = [...validatePaymentDetails(form, metadata, metadataForm, Number(row.totalDeposit)), ...validate006Metadata(metadata, metadataForm, previousReference)];
    if (correctionWorkspace && !addedCorrectionProduct && correctionOperationCode === 3 && (form.actualDepositAmount == null || form.actualDepositAmount <= 0))
      errors.push("כאשר בוצעה הפקדה נוספת יש להזין את סכום ההפקדה הנוספת בפועל.");
    if (!negative && !differences && isOldPensionFund && !metadataForm.oldPensionTypeCode)
      errors.push("בקרן פנסיה ותיקה יש לבחור סוג פנסיה: מקיפה או יסוד.");
    if (!negative && !differences && isOldPensionFund && metadataForm.employmentPercentage == null && metadataForm.workDaysInMonth == null)
      errors.push("בקרן פנסיה ותיקה יש להזין חלקיות משרה או ימי עבודה בחודש.");
    if (operation5 && !annualEmployerAffidavitSatisfied)
      errors.push("בקוד פעולה 5 נדרש תצהיר מעסיק שנתי (סוג מסמך 3) לפחות פעם אחת בשנה.");
    if (errors.length) { const message = shortError(errors.join(" ")); setError(message); notify.error(message); return; }
    setSaving(true);
    try {
      const persistedPayment: ManualPaymentInput = {
        ...form,
        paymentMethod: metadataForm.paymentMethodCode == null ? form.paymentMethod : String(metadataForm.paymentMethodCode),
        actualDepositAmount: correctionWorkspace && !addedCorrectionProduct && correctionOperationCode === 2 ? null : form.actualDepositAmount,
        correctionOperationCode: correctionWorkspace && !addedCorrectionProduct ? correctionOperationCode : null,
      };
      await manualDepositsApi.savePayment(organizationId, employerId, reportId, row.id, persistedPayment);
      if (!differences) {
        await employerInterfaceApi.updateProductMetadata(organizationId, employerId, reportId, row.id, metadataForm);
        await employerInterfaceApi.updatePreviousReference(organizationId, employerId, reportId, row.id, previousReference);
      }
      onSaved({ ...row, ...persistedPayment, confirmationFileName: paymentProofs[0]?.originalFileName || persistedPayment.confirmationFileName });
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "שמירת פרטי התשלום נכשלה"); setError(message); notify.error(message); setSaving(false);
    }
  }

  const providerAccount = form.providerAccount || providerAccountFromReference(providerReference);

  const paymentEvidencePanel = !negative && (!effectiveNoMoneyCorrection || paymentProofs.length > 0) ? <section className="payment-panel">
    <h3>אסמכתאות ואישורי תשלום</h3>
    <div className="payment-evidence-control">
      {!readOnly && !effectiveNoMoneyCorrection ? <UiFileUpload label="צירוף אישור תשלום (עד 3MB, אם קיים)" className="payment-upload"
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        maxBytes={3_000_000} disabled={saving} busy={uploadingProof}
        onFileSelected={uploadPaymentProof} onInvalid={(message) => { setError(message); notify.error(message); }} /> : null}
      {paymentProofs.length > 0 ? <div className="payment-evidence-list">
        {paymentProofs.map((item, index) => <button type="button" className="btn btn-secondary" key={item.id}
          onClick={() => void paymentConfirmationsApi.download(organizationId, employerId, reportId, row.id, item)
            .catch(() => notify.error("הורדת אישור התשלום נכשלה"))}>
          <Download size={16} aria-hidden="true" />{index === 0 ? "אישור אחרון: " : "אישור קודם: "}{item.originalFileName}
        </button>)}
      </div> : readOnly ? <span className="payment-evidence-empty">לא צורפה אסמכתא.</span> : null}
    </div>
  </section> : null;

  return <AppModal open title="פרטי תשלום"
    subtitle={readOnly ? "נתוני ההפקדה כפי שנשמרו בדיווח. דיווח שנשלח מחייב דיווח מתקן לשינויים." : "השלמת הנתונים הנדרשים לדיווח בלבד"}
    onClose={onClose} width="xl" className="payment-modal" bodyClassName="payment-modal-body"
    actions={readOnly ? <button className="btn btn-secondary" onClick={onClose}>סגירה</button> : <>
      <button className="btn btn-primary" disabled={saving || loadingMetadata || uploadingProof} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button>
      <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
    </>}>
      <div className="payment-employer-chip"><BriefcaseBusiness size={17} /><b>{employer?.legalName || "המעסיק"}</b><span>{employer?.registrationNumber || ""}</span><CreditCard size={15} /></div>
      {error ? <Tooltip content={error} label={error}><div className="notice notice-error payment-error">{error}</div></Tooltip> : null}
      {differences && !correctionWorkspace ? <div className="notice notice-info payment-error">בדיווח הפרשים אין צורך להשלים את פרטי הדיווח הנוספים בשלב הזה. הם יושלמו בעת יצירת דיווח שוטף או שלילי המבוסס עליו.</div> : null}
      {correctionWorkspace ? <div className="notice notice-info payment-error">{addedCorrectionProduct
        ? "זהו מוצר חדש בגרסה המתוקנת. הוא יישלח כרשומה חדשה (פעולה 1) בלי מזהה קודם."
        : "זהו מוצר קיים שנערך. בחרו אם התיקון כולל כסף נוסף; ALPHA תחיל את הבחירה על ההעברה הרלוונטית ותבנה את מסמכי הדלתא הנדרשים."}</div> : null}
      {operation6 ? <div className="notice notice-info payment-error">בקוד פעולה 6 מדובר בביטול תנועה ללא החזר למעסיק, ולכן אין להעביר ערך בשדה אמצעי התשלום.</div> : null}
      {readOnly ? <div className="notice notice-info">זהו דיווח שנשמר ואינו פתוח לעריכה. ניתן לצפות בפרטי ההפקדה אך אין לשנות דיווחים שהועברו. לתיקון יש ליצור דיווח מתקן.</div> : null}
      <fieldset className="deposit-payment-editor-fields" disabled={readOnly} aria-label={readOnly ? "פרטי הפקדה לצפייה בלבד" : undefined}>
      <div className="payment-layout"><div className="payment-main">
          <section className="payment-panel"><h3>סיכום</h3><div className="payment-provider-grid"><div><span className="payment-summary-label">עובד ומוצר</span><b>{row.employeeName} · {form.providerName}</b><small>{row.policyNumber || "ללא מס׳ פוליסה"}</small></div><div className="payment-summary-item"><span className="payment-summary-label">סכום מחושב</span><b>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</b></div><div><span className="payment-summary-label">חשבון יצרן</span><b className="account-number">{providerAccount || "לא נמצא חשבון יצרן"}</b></div><div><span className="payment-summary-label">{configuredPensionDebit ? "חשבון חיוב בהרשאה" : "חשבון מעסיק להעברה"}</span><b className="account-number">{metadataForm.paymentMethodCode !== 6 && bankRequired && (!form.employerBankCode || !form.employerAccount) ? "יש להזין פרטי חשבון להעברה" : formatEmployerAccount({ ...row, ...form }, resolvedPaymentAccount)}</b></div></div></section>

          {correctionWorkspace && !addedCorrectionProduct ? <section className="payment-panel"><h3>אופן התיקון להעברה לקופה</h3><div className="payment-method-grid">
            <div className="field"><label>סוג תיקון *</label><EmployerInterfaceOptionSelect
              category="operation-code"
              scope="current"
              allowedCodes={[2, 3]}
              suppliedOptions={optionsFor("operation-code", "current")}
              suppliedLoading={editorOptionsLoading}
              suppliedError={editorOptionsError}
              value={correctionOperationCode}
              required
              placeholder="בחירת סוג תיקון"
              onChange={(value) => {
                const next = value === 3 ? 3 : 2;
                setCorrectionOperationCode(next);
                if (next === 2) patch("actualDepositAmount", null);
                setError("");
              }}
            /></div>
            {correctionOperationCode === 3 ? <div className="field"><label>סכום הפקדה נוספת בפועל *</label><UiInput type="number" min="0.01" step="0.01" value={form.actualDepositAmount ?? ""} onChange={(event) => patch("actualDepositAmount", event.target.value === "" ? null : Number(event.target.value))} /></div> : null}
            <div className="field"><label>חשבון יצרן</label><UiInput value={form.providerAccount} onChange={(event) => patch("providerAccount", event.target.value)} /></div>
            <div className="field"><label>תאריך ערך</label><UiDateInput value={form.valueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("valueDate", value || null)} /></div>
            <div className="field"><label>מס׳ אסמכתא</label><UiInput maxLength={50} value={form.referenceNumber} onChange={(event) => patch("referenceNumber", event.target.value)} /></div>
            <div className="field"><label>בנק</label><UiAutocomplete ariaLabel="בחירת בנק" value={bankSelection}
              onOpenChange={setBankOpen} onValueChange={chooseBank} onClear={() => { setForm((current) => ({ ...current, employerBankCode: "", employerBankName: "", employerBranch: "" })); setBranchSelection(""); setBranches([]); }}
              options={banks.map((bank) => ({ value: String(bank.bankCode), label: bankLabel(bank) }))} placeholder="חיפוש בנק" /></div>
            <div className="field"><label>סניף</label><UiAutocomplete ariaLabel="בחירת סניף" value={branchSelection}
              onOpenChange={setBranchOpen} onValueChange={chooseBranch} disabled={!form.employerBankCode}
              options={branches.map((branch) => ({ value: String(branch.branchCode), label: branchLabel(branch) }))}
              placeholder={form.employerBankCode ? "חיפוש סניף" : "יש לבחור בנק תחילה"} /></div>
            <div className="field"><label>מס׳ חשבון</label><UiInput inputMode="numeric" maxLength={20} value={form.employerAccount && !/^0+$/.test(form.employerAccount) ? form.employerAccount : ""} onChange={(event) => patch("employerAccount", event.target.value.replace(/\D/g, "").slice(0, 20))} /></div>
          </div></section> : null}

          {!differences ? <section className="payment-panel"><h3>{operation6 ? "פרטי פעולה" : negative ? "פרטי החזר" : "פרטי תשלום"}</h3><div className="payment-method-grid">
            {showOfficialPaymentMethod ? <div className="field payment-method"><label>{negative ? "אופן החזר התשלום המבוקש *" : "אמצעי תשלום *"}</label>{configuredPensionDebit
              ? <UiInput value="6 – הרשאה לחיוב חשבון" disabled aria-label="אמצעי תשלום 6 – נעול לפי הרשאה פעילה" />
              : <EmployerInterfaceOptionSelect category="payment-method" operationCode={metadataForm.operationCode} value={metadataForm.paymentMethodCode} required onChange={(value) => {
              setMetadataForm((current) => value === 9
                ? { ...current, paymentMethodCode: value, employerAccountType: 1, receiverAccountType: 1 }
                : { ...current, paymentMethodCode: value });
              if (value === 6 && resolvedPaymentAccount?.mandateIsActive) {
                setForm((current) => ({ ...current, employerBankCode: "0", employerBranch: "000",
                  employerAccount: "00000000000000000000", employerBankName: "", referenceNumber: "" }));
                setBankSelection(""); setBranchSelection("");
              } else if (metadataForm.paymentMethodCode === 6 && value !== 6) {
                // The masked mandate account is not usable as a manually reported transfer account.
                setForm((current) => ({ ...current, employerBankCode: "", employerBranch: "",
                  employerAccount: "", employerBankName: "" }));
                setBankSelection(""); setBranchSelection("");
              }
              setError("");
            }} />}</div> : null}
            {!negative && !noMoneyCorrection && metadataForm.receiverAccountType === 1 && metadataForm.paymentMethodCode !== 9 ? <div className="field"><label>{metadataForm.paymentMethodCode === 6 ? "תאריך ערך" : "תאריך ערך הפקדה לקופה *"}</label><UiDateInput value={form.valueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("valueDate", value || null)} /></div> : null}
            {!negative && metadataForm.operationCode === 3 ? <div className="field"><label>סכום הפקדה נוספת בפועל *</label><UiInput type="number" min="0" step="0.01" value={form.actualDepositAmount ?? ""} onChange={(e) => patch("actualDepositAmount", e.target.value === "" ? null : Number(e.target.value))} /></div> : null}
            {!negative && metadataForm.paymentMethodCode === 7 ? <div className="field"><label>קוד פנימי של הגורם השולח במס״ב *</label><UiInput maxLength={16} value={form.masavSenderCode} onChange={(e) => patch("masavSenderCode", e.target.value)} placeholder="8–16 תווים" /></div> : null}
            {!negative && !noMoneyCorrection && (metadataForm.employerAccountType === 2 || metadataForm.receiverAccountType === 2) ? <div className="field"><label>תאריך ערך הפקדה לחשבון נאמנות *</label><UiDateInput value={form.trustAccountValueDate?.slice(0, 10) || ""} onValueChange={(value) => patch("trustAccountValueDate", value || null)} /></div> : null}
            {!negative && !noMoneyCorrection && (metadataForm.paymentMethodCode === 1 || metadataForm.paymentMethodCode === 3 || configuredPensionDebit) ? <div className="field"><label>{configuredPensionDebit ? "מס׳ אסמכתא" : "מס׳ אסמכתא *"}</label><UiInput required={!configuredPensionDebit} maxLength={50} value={form.referenceNumber} onChange={(e) => patch("referenceNumber", e.target.value)} /></div> : null}
            {bankRequired || configuredPensionDebit ? <>
              <div className="field"><label>{bankRequired ? "בנק *" : "בנק"}</label><UiAutocomplete
                required={bankRequired} ariaLabel="בחירת בנק" value={bankSelection}
                onOpenChange={setBankOpen} onValueChange={chooseBank} onClear={() => {
                  setForm((current) => ({ ...current, employerBankCode: "", employerBankName: "",
                    employerBranch: "" }));
                  setBranchSelection(""); setBranches([]);
                }}
                options={banks.map((bank) => ({ value: String(bank.bankCode), label: bankLabel(bank) }))}
                placeholder="חיפוש בנק" /></div>
              <div className="field"><label>{bankRequired ? "סניף *" : "סניף"}</label><UiAutocomplete required={bankRequired} ariaLabel="בחירת סניף" value={branchSelection} onOpenChange={setBranchOpen} onValueChange={chooseBranch} disabled={!form.employerBankCode} options={branches.map((branch) => ({ value: String(branch.branchCode), label: branchLabel(branch) }))} placeholder={form.employerBankCode ? "חיפוש סניף" : "יש לבחור בנק תחילה"} /></div>
              <div className="field"><label>{bankRequired ? "מס׳ חשבון *" : "מס׳ חשבון"}</label><UiInput required={bankRequired} inputMode="numeric" maxLength={20}
                value={form.employerAccount && !/^0+$/.test(form.employerAccount) ? form.employerAccount : ""} onChange={(e) => patch("employerAccount", e.target.value.replace(/\D/g, "").slice(0, 20))} /></div>
            </> : null}
          </div></section> : null}

          {!readOnly ? paymentEvidencePanel : null}

          {!differences && !negative && isOldPensionFund ? <section className="payment-panel"><h3>השלמה נדרשת לקרן ותיקה</h3><div className="payment-method-grid">
            <div className="field"><label>סוג פנסיה *</label><EmployerInterfaceOptionSelect category="old-pension-type" scope="current" value={metadataForm.oldPensionTypeCode} suppliedOptions={optionsFor("old-pension-type", "current")} suppliedLoading={editorOptionsLoading} suppliedError={editorOptionsError} required onChange={(value) => patchMetadata("oldPensionTypeCode", value)} /></div>
            <div className="field"><label>חלקיות משרה (%)</label><UiInput type="number" min="1" max="100" step="0.01" value={metadataForm.employmentPercentage ?? ""} onChange={(e) => patchMetadata("employmentPercentage", e.target.value === "" ? null : Number(e.target.value))} /></div>
            <div className="field"><label>ימי עבודה בחודש</label><UiInput type="number" min="0" max="31" step="1" value={metadataForm.workDaysInMonth ?? ""} onChange={(e) => patchMetadata("workDaysInMonth", e.target.value === "" ? null : Number(e.target.value))} /></div>
          </div></section> : null}

          {negative ? <section className="payment-panel"><h3>פרטי הבקשה</h3><div className="payment-method-grid">
            <div className="field"><label>סוג פעולה *</label><EmployerInterfaceOptionSelect category="operation-code" scope="negative" value={metadataForm.operationCode} suppliedOptions={optionsFor("operation-code", "negative")} suppliedLoading={editorOptionsLoading} suppliedError={editorOptionsError} required onChange={(value) => patchMetadata("operationCode", value)} /></div>
            <div className="field"><label>סיבת בקשה להחזר/ביטול *</label><EmployerInterfaceOptionSelect category="refund-reason" scope="negative" value={metadataForm.refundReason} suppliedOptions={optionsFor("refund-reason", "negative")} suppliedLoading={editorOptionsLoading} suppliedError={editorOptionsError} required onChange={(value) => patchMetadata("refundReason", value)} /></div>
          </div></section> : null}



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
                  {!item ? <UiFileUpload className="btn btn-secondary" label="צרף PDF עד 3MB"
                    accept="application/pdf,.pdf" maxBytes={3_000_000}
                    busy={uploadingAttachment != null} onFileSelected={(file) => uploadAttachment(code, file)}
                    onInvalid={(message) => { setError(message); notify.error(message); }} /> : null}
                </div>
              </div>)}
            </div>
          </section> : null}

          {needsPrevious ? <section className="payment-panel"><h3>קישור לדיווח המקורי</h3><div className="notice notice-info" style={{ marginBottom: 12 }}>בפעולת תיקון או ביטול יש לקשר לדיווח המקורי. ניתן להזין אחד מהמזהים או לבחור חריג מתאים.</div><div className="payment-method-grid">
            <div className="field"><label>מספר זיהוי קודם (GUID)</label><UiInput maxLength={36} value={previousReference.previousIdentifier} onChange={(e) => patchPrevious("previousIdentifier", e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" /></div>
            <div className="field"><label>מספר מסלקה קודם (GUID)</label><UiInput maxLength={36} value={previousReference.previousClearingIdentifier} onChange={(e) => patchPrevious("previousClearingIdentifier", e.target.value)} placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" /></div>
            <div className="field"><label>חריג להיעדר מזהה קודם</label><EmployerInterfaceOptionSelect category="previous-reference-exception" value={previousReference.previousReferenceExceptionCode} suppliedOptions={optionsFor("previous-reference-exception")} suppliedLoading={editorOptionsLoading} suppliedError={editorOptionsError} onChange={(value) => patchPrevious("previousReferenceExceptionCode", value)} /></div>
          </div></section> : null}
        </div>
      </div>
      </fieldset>
      {readOnly ? paymentEvidencePanel : null}
  </AppModal>;
}
