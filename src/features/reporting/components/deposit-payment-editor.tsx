"use client";

import { UiAutocomplete, UiDateInput, UiInput, UiSelect } from "@/components/ui/ui-controls";
import { UiFileUpload } from "@/components/ui/ui-file-upload";
import { Tooltip } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BriefcaseBusiness, CreditCard, Download, Trash2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { EmployerInterfaceOptionSelect } from "@/features/reporting/components/employer-interface-option-select";
import { notify } from "@/components/ui/notifications";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import { referenceDataApi } from "@/features/reference-data/api";
import { employerInterfaceApi, type EmployerInterfaceOption, type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/features/reporting/employer-interface-api";
import { manualDepositsApi, type ManualDepositContributionLimit, type ManualDepositRow, type ManualPaymentInput } from "@/features/reporting/deposits-api";
import { reportAttachmentsApi, type ReportAttachment, type LibraryDocumentCandidate } from "@/features/reporting/attachments-api";
import { paymentConfirmationsApi, type PaymentConfirmation } from "@/features/reporting/payment-confirmations-api";
import type { Employer } from "@/features/employers/types";
import type { PensionFundOption, PensionProductType } from "@/features/pension/types";
import type { BankBranchOption, BankOption } from "@/features/reference-data/types";
import { autocompleteLookupTerm } from "@/features/reference-data/lookup-term";
import { isDifferencesKind, isNegativeKind, requiresPreviousReference, validate006Metadata, validatePaymentDetails, validatePreventableContributionRules } from "@/features/reporting/deposit-validation";
import { productNames, emptyPreviousReference, shortError, formatEmployerAccount, emptyMetadata, providerAccountFromReference, bankLabel, branchLabel } from "@/features/reporting/deposit-helpers";

export function DepositPaymentEditor({ employer, organizationId, employerId, reportId, row, contributionLimits, onClose, onSaved, onEvidenceChanged, readOnly = false, embedded = false, footerTargetId }: {
  employer: Employer | null; organizationId: string; employerId: string; reportId: string; row: ManualDepositRow;
  contributionLimits: ManualDepositContributionLimit[];
  onClose: () => void; onSaved: (row: ManualDepositRow) => void; onEvidenceChanged: (items: PaymentConfirmation[]) => void; footerTargetId?: string;
  readOnly?: boolean;
  embedded?: boolean;
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
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSelection, setBankSelection] = useState(row.employerBankCode || row.employerBankName ? `${row.employerBankCode}${row.employerBankCode && row.employerBankName ? " - " : ""}${row.employerBankName}` : "");
  const [branchSelection, setBranchSelection] = useState(row.employerBranch || "");
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [libraryCandidates, setLibraryCandidates] = useState<LibraryDocumentCandidate[]>([]);
  const [selectedLibraryDocuments, setSelectedLibraryDocuments] = useState<Record<number, string>>({});
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
      paymentAccountsApi.employerPaymentResolution(organizationId, employerId),
      employerInterfaceApi.optionsBundle(["operation-code", "old-pension-type", "refund-reason", "previous-reference-exception"]),
      reportAttachmentsApi.libraryCandidates(organizationId, employerId, reportId, row.id).catch(() => [] as LibraryDocumentCandidate[]),
    ]).then(([item, previous, attachmentList, proofList, paymentResolution, bundledOptions, availableLibraryDocuments]) => {
      if (!active) return;
      setMetadata(item);
      const automaticDebit = !readOnly && !isNegativeKind(item.reportKind) && !isDifferencesKind(item.reportKind)
        && paymentResolution.account?.mandateIsActive === true
        && item.operationCode !== 2 && item.operationCode !== 7;
      setMetadataForm({ operationCode: item.operationCode, depositStatus: item.depositStatus, employeeStatus: item.employeeStatus, statusStartDate: item.statusStartDate,
        employmentPercentage: item.employmentPercentage, workDaysInMonth: item.workDaysInMonth, lastDeposit: item.lastDeposit, refundReason: item.refundReason, collectiveAgreementRefund: item.collectiveAgreementRefund,
        paymentMethodCode: automaticDebit ? 6 : item.paymentMethodCode, employerAccountType: automaticDebit ? 1 : item.employerAccountType,
        receiverAccountType: automaticDebit ? 1 : item.receiverAccountType, oldPensionTypeCode: item.oldPensionTypeCode });
      setPreviousReference(previous);
      setAttachments(attachmentList.items);
      setLibraryCandidates(availableLibraryDocuments);
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
      void referenceDataApi.pensionFunds(row.productType as PensionProductType, row.fundExternalKey, 20).then((items) => {
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
      void referenceDataApi.banks(autocompleteLookupTerm(bankSelection), 100)
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
      void referenceDataApi.bankBranches(bankCode, autocompleteLookupTerm(branchSelection), 200)
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

  async function attachStoredDocument(documentTypeCode: 3 | 4 | 5 | 6) {
    if (readOnly) return;
    const candidates = libraryCandidates.filter(item => item.documentTypeCode === documentTypeCode);
    const selectedId = selectedLibraryDocuments[documentTypeCode] || candidates[0]?.id;
    if (!selectedId) return;
    setUploadingAttachment(documentTypeCode);
    setError("");
    try {
      await reportAttachmentsApi.attachFromLibrary(organizationId, employerId, reportId, selectedId,
        documentTypeCode === 3 ? null : row.id);
      await refreshAttachments();
      notify.success("המסמך מהפרופיל צורף לעותק הדיווח.");
    } catch (err) {
      const message = shortError(err instanceof Error ? err.message : "צירוף המסמך מהפרופיל נכשל");
      setError(message); notify.error(message);
    } finally {
      setUploadingAttachment(null);
    }
  }

  function storedDocumentPicker(code: 3 | 4 | 5 | 6) {
    const candidates = libraryCandidates.filter(item => item.documentTypeCode === code);
    if (readOnly || candidates.length === 0) return null;
    return <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <UiSelect aria-label="בחירת מסמך שמור בפרופיל"
        value={selectedLibraryDocuments[code] || candidates[0].id}
        disabled={uploadingAttachment != null}
        onChange={event => setSelectedLibraryDocuments(current => ({ ...current, [code]: event.target.value }))}>
        {candidates.map(doc => <option key={doc.id} value={doc.id}>{doc.originalFileName}</option>)}
      </UiSelect>
      <button type="button" className="btn btn-secondary"
        disabled={uploadingAttachment != null}
        onClick={() => void attachStoredDocument(code)}>צרף מהפרופיל</button>
    </div>;
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
    const errors = [
      ...validatePreventableContributionRules(row, metadata, metadataForm, contributionLimits),
      ...validatePaymentDetails(form, metadata, metadataForm, Number(row.totalDeposit)),
      ...validate006Metadata(metadata, metadataForm, previousReference),
    ];
    if (correctionWorkspace && !addedCorrectionProduct && correctionOperationCode === 3 && (form.actualDepositAmount == null || form.actualDepositAmount <= 0))
      errors.push("כאשר בוצעה הפקדה נוספת יש להזין את סכום ההפקדה הנוספת בפועל.");
    if (!negative && !differences && isOldPensionFund && !metadataForm.oldPensionTypeCode)
      errors.push("בקרן פנסיה ותיקה יש לבחור סוג פנסיה: מקיפה או יסוד.");
    if (!negative && !differences && isOldPensionFund && metadataForm.employmentPercentage == null && metadataForm.workDaysInMonth == null)
      errors.push("בקרן פנסיה ותיקה יש להזין חלקיות משרה או ימי עבודה בחודש.");
    if (operation5 && metadataForm.collectiveAgreementRefund == null)
      errors.push("יש לבחור האם השבת הכספים מתבצעת מכוח הסכם קיבוצי.");
    if (operation5 && metadataForm.collectiveAgreementRefund === true && !collectiveAgreementDeclaration)
      errors.push("בהשבה מכוח הסכם קיבוצי חובה לצרף הצהרת מעסיק מסוג 6 למוצר זה.");
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

  const editorContent = <>{""}
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
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="collective-agreement-refund">האם השבת הכספים מתבצעת מכוח הסכם קיבוצי? *</label>
              <div id="collective-agreement-refund" role="group" aria-label="האם השבת הכספים מתבצעת מכוח הסכם קיבוצי?" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className={metadataForm.collectiveAgreementRefund === true ? "btn btn-primary" : "btn btn-secondary"}
                  aria-pressed={metadataForm.collectiveAgreementRefund === true} disabled={readOnly}
                  onClick={() => patchMetadata("collectiveAgreementRefund", true)}>כן — נדרש מסמך מסוג 6</button>
                <button type="button" className={metadataForm.collectiveAgreementRefund === false ? "btn btn-primary" : "btn btn-secondary"}
                  aria-pressed={metadataForm.collectiveAgreementRefund === false} disabled={readOnly}
                  onClick={() => patchMetadata("collectiveAgreementRefund", false)}>לא</button>
              </div>
            </div>
            <h3>מסמכים מצורפים לדיווח השלילי</h3>
            <div className="notice notice-info" style={{ marginBottom: 12 }}>
              בקוד פעולה 5 (בקשת השבת כספים), תצהיר מעסיק מסוג 3 נדרש לפחות פעם אחת בשנה.
              אם ההשבה מתבצעת מכוח הסכם קיבוצי, יש לצרף כאן הצהרת מעסיק להסכם הקיבוצי (סוג 6) לעובד ולמוצר הרלוונטיים.
              אם ההשבה אינה מכוח הסכם קיבוצי, אין צורך במסמך מסוג 6. אישור עובד (סוג 4) מצורף בהתאם לנסיבות ההשבה.
              המסמכים נשמרים כ-PDF ונשלחים עם הדיווח השלילי; העלאתם לפרופיל בלבד אינה מצרפת אותם לדיווח.
            </div>
            {annualEmployerAffidavitSatisfied && !reportAffidavit ? <div className="notice notice-success" style={{ marginBottom: 12 }}>תצהיר המעסיק השנתי כבר הועבר בדיווח קודם השנה.</div> : null}
            <div style={{ display: "grid", gap: 10 }}>
              {([
                { code: 3 as const, label: "תצהיר מעסיק", item: reportAffidavit, scope: "שנתי ברמת הדיווח" },
                { code: 4 as const, label: "אישור עובד להשבת כספים", item: employeeApproval, scope: "לעובד/מוצר זה" },
                { code: 6 as const, label: "הצהרת מעסיק - הסכם קיבוצי", item: collectiveAgreementDeclaration, scope: "לעובד/מוצר זה" },
              ]).map(({ code, label, item, scope }) => <div key={code} style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div><b>{label}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{scope}{item ? ` · ${item.originalFileName}` : ""}</div>
                  {code === 6 ? <small style={{ display: "block", color: "var(--muted)" }}>
                    נדרש כאשר ההשבה מתבצעת מכוח הסכם קיבוצי. אם זו השבה כזו, צרפו את ה-PDF כאן לפני שליחת הדיווח כדי להימנע מדחיית המסמך (קודים 102–103).
                  </small> : null}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {item && !readOnly ? <button type="button" className="btn btn-secondary" onClick={() => void removeAttachment(item.id)}><Trash2 size={14} />הסר</button> : null}
                  {!item ? storedDocumentPicker(code) : null}
                  {!item && !readOnly ? <UiFileUpload className="btn btn-secondary" label="צרף PDF עד 3MB"
                    accept="application/pdf,.pdf" maxBytes={3_000_000}
                    busy={uploadingAttachment != null} onFileSelected={(file) => uploadAttachment(code, file)}
                    onInvalid={(message) => { setError(message); notify.error(message); }} /> : null}
                </div>
              </div>)}
            </div>
          </section> : null}

          {!negative && !differences && row.productType === 1 && metadataForm.employeeStatus !== 14 ?
            <section className="payment-panel">
              <h3>מסמך הצטרפות לקרן ברירת מחדל</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div><b>קוד 5 — בקשת עובד להצטרפות לקרן ברירת מחדל</b>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {defaultFundJoinRequest ? defaultFundJoinRequest.originalFileName : "מסמך לעובד ולקרן הפנסיה בדיווח זה"}
                  </div>
                </div>
                {defaultFundJoinRequest && !readOnly ?
                  <button type="button" className="btn btn-secondary" onClick={() => void removeAttachment(defaultFundJoinRequest.id)}>
                    <Trash2 size={14} />הסר</button> : null}
                {!defaultFundJoinRequest ? storedDocumentPicker(5) : null}
                {!defaultFundJoinRequest && !readOnly ? <UiFileUpload className="btn btn-secondary"
                    label="צרף PDF עד 3MB" accept="application/pdf,.pdf" maxBytes={3_000_000}
                    busy={uploadingAttachment != null} onFileSelected={file => uploadAttachment(5, file)}
                    onInvalid={message => { setError(message); notify.error(message); }} /> : null}
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
  </>;

  if (embedded) return <section className="feedback-code18-payment-editor" aria-label="עריכת פרטי תשלום והפקדה">
    <div className="feedback-code18-payment-actions"><strong>פרטי תשלום</strong></div>
    {editorContent}
    {footerTargetId && typeof document !== "undefined" && document.getElementById(footerTargetId)
      ? createPortal(<button type="button" className="btn btn-primary"
          disabled={saving || loadingMetadata || uploadingProof}
          onClick={() => void save()}>{saving ? "שומר..." : "שמירת התיקון"}</button>,
          document.getElementById(footerTargetId)!)
      : null}
  </section>;

  return <AppModal open title="פרטי תשלום"
    subtitle={readOnly ? "נתוני ההפקדה כפי שנשמרו בדיווח. דיווח שנשלח מחייב דיווח מתקן לשינויים." : "השלמת הנתונים הנדרשים לדיווח בלבד"}
    onClose={onClose} width="xl" className="payment-modal" bodyClassName="payment-modal-body"
    actions={readOnly ? <button className="btn btn-secondary" onClick={onClose}>סגירה</button> : <>
      <button className="btn btn-primary" disabled={saving || loadingMetadata || uploadingProof} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button>
      <button className="btn btn-secondary" onClick={onClose}>ביטול</button>
    </>}>
    {editorContent}
  </AppModal>;
}
