"use client";

import { useEffect, useState } from "react";
import { Building2, Save, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { employersApi } from "@/features/employers/api";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import { referenceDataApi } from "@/features/reference-data/api";
import type { EmployerProfileCenterSettings } from "@/features/employers/types";
import type { BankDebitMandateStatus, EmployerPaymentAccount, EmployerPaymentAccountInput, PensionPaymentResolution } from "@/features/payment-accounts/types";
import type { BankBranchOption, BankOption } from "@/features/reference-data/types";
import { UiAutocomplete, UiChoiceCard, UiInput, UiSelect } from "@/components/ui/ui-controls";
import { Tooltip } from "@/components/ui/tooltip";
import { autocompleteLookupTerm } from "@/features/reference-data/lookup-term";
import { isCompletePaymentAccount, PAYMENT_ACCOUNT_REQUIRED_MESSAGE } from "@/features/payment-accounts/schemas";

export const EMPTY_ACCOUNT: EmployerPaymentAccountInput = {
  bankId: 0,
  branchId: 0,
  accountNumber: "",
  accountHolderName: "",
  accountHolderId: "",
  isDefault: false,
};
export function PensionPaymentTab({ organizationId, employerId, canManage, accounts, setAccounts, pensionPayment, hasOrganizationContext, onModeSaved }: {
  organizationId: string;
  employerId: string;
  canManage: boolean;
  accounts: EmployerPaymentAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<EmployerPaymentAccount[]>>;
  pensionPayment: EmployerProfileCenterSettings["pensionPayment"];
  hasOrganizationContext: boolean;
  onModeSaved: (value: EmployerProfileCenterSettings["pensionPayment"]) => void;
}) {
  const [resolution, setResolution] = useState<PensionPaymentResolution | null>(null);
  const [selectedMode, setSelectedMode] = useState<1 | 2 | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmployerAccount, setEditingEmployerAccount] = useState(false);
  const [form, setForm] = useState<EmployerPaymentAccountInput>({ ...EMPTY_ACCOUNT, isDefault: true });
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [mandateStatus, setMandateStatus] = useState<BankDebitMandateStatus>(1);
  const [externalMandateId, setExternalMandateId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingChoice, setLoadingChoice] = useState(true);

  async function loadResolution() {
    setLoadingChoice(true);
    try {
      const value = await paymentAccountsApi.employerPaymentResolution(organizationId, employerId);
      setResolution(value);
      const effectiveMode: 1 | 2 = value.source === "Organization" ? 2 : 1;
      setSelectedMode(effectiveMode);
      setAccounts(value.account ? [value.account] : []);
      setEditingEmployerAccount(false);
      if (effectiveMode === 1 && value.employerAccount) {
        const full = await paymentAccountsApi.employerPaymentAccount(organizationId, employerId, value.employerAccount.id);
        setEditingId(value.employerAccount.id);
        setForm({
          bankId: full.bankId,
          branchId: full.branchId,
          accountNumber: full.accountNumber,
          accountHolderName: full.accountHolderName,
          accountHolderId: full.accountHolderId,
          isDefault: true,
        });
        setBankSearch(String(full.bankId));
        setBranchSearch(String(full.branchId));
        setMandateStatus(full.mandate?.status ?? 1);
        setExternalMandateId(full.mandate?.externalMandateId ?? "");
        setDocumentId(full.mandate?.documentId ?? "");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת חשבון התשלום נכשלה");
    } finally {
      setLoadingChoice(false);
    }
  }

  useEffect(() => { void loadResolution(); }, [organizationId, employerId]);

  useEffect(() => {
    if (!bankOpen) return;
    const timer = window.setTimeout(() => {
      referenceDataApi.banks(autocompleteLookupTerm(bankSearch), 50).then(setBanks).catch(() => setBanks([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [bankOpen, bankSearch]);

  useEffect(() => {
    const bank = banks.find((item) => item.bankCode === form.bankId);
    if (bank && /^\d+$/.test(bankSearch)) setBankSearch(`${bank.bankCode} - ${bank.bankName}`);
  }, [banks, form.bankId, bankSearch]);

  useEffect(() => {
    if (!branchOpen || !form.bankId) return;
    const timer = window.setTimeout(() => {
      referenceDataApi.bankBranches(form.bankId, autocompleteLookupTerm(branchSearch), 100).then(setBranches).catch(() => setBranches([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [branchOpen, form.bankId, branchSearch]);

  useEffect(() => {
    const branch = branches.find((item) => item.branchCode === form.branchId);
    if (branch && /^\d+$/.test(branchSearch)) setBranchSearch(`${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`);
  }, [branches, form.branchId, branchSearch]);

  async function selectEmployerMode() {
    setSelectedMode(1);
    const direct = resolution?.employerAccount;
    if (!direct) {
      setEditingId(null);
      setEditingEmployerAccount(true);
      setForm({ ...EMPTY_ACCOUNT, isDefault: true });
      setBankSearch("");
      setBranchSearch("");
      setMandateStatus(1);
      setExternalMandateId("");
      setDocumentId("");
      return;
    }
    try {
      const full = await paymentAccountsApi.employerPaymentAccount(organizationId, employerId, direct.id);
      setEditingId(direct.id);
      setForm({
        bankId: full.bankId,
        branchId: full.branchId,
        accountNumber: full.accountNumber,
        accountHolderName: full.accountHolderName,
        accountHolderId: full.accountHolderId,
        isDefault: true,
      });
      setBankSearch(String(full.bankId));
      setBranchSearch(String(full.branchId));
      setMandateStatus(full.mandate?.status ?? 1);
      setExternalMandateId(full.mandate?.externalMandateId ?? "");
      setDocumentId(full.mandate?.documentId ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת חשבון המעסיק נכשלה");
    }
  }

  async function startEmployerAccountEdit() {
    if (!canManage || !resolution?.employerAccount) return;
    try {
      const full = await paymentAccountsApi.employerPaymentAccount(organizationId, employerId, resolution.employerAccount.id);
      setEditingId(resolution.employerAccount.id);
      setForm({
        bankId: full.bankId,
        branchId: full.branchId,
        accountNumber: full.accountNumber,
        accountHolderName: full.accountHolderName,
        accountHolderId: full.accountHolderId,
        isDefault: true,
      });
      setBankSearch(String(full.bankId));
      setBranchSearch(String(full.branchId));
      setMandateStatus(full.mandate?.status ?? 1);
      setExternalMandateId(full.mandate?.externalMandateId ?? "");
      setDocumentId(full.mandate?.documentId ?? "");
      setEditingEmployerAccount(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת חשבון המעסיק לעריכה נכשלה");
    }
  }

  function selectOrganizationMode() {
    if (!resolution?.organizationAccount) return;
    setSelectedMode(2);
  }

  async function saveOrganizationMode() {
    if (!canManage || !resolution?.organizationAccount) return;
    setSaving(true);
    try {
      const result = await employersApi.updateEmployerPensionPaymentMode(organizationId, employerId, 2);
      onModeSaved({ ...pensionPayment, mode: result.mode, modeOverridden: result.modeOverridden });
      await loadResolution();
      toast.success("חשבון הארגון נשמר כחשבון התשלום הפנסיוני של המעסיק");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת מקור החשבון נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function saveEmployerMode(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    if (!isCompletePaymentAccount(form)) {
      toast.error(PAYMENT_ACCOUNT_REQUIRED_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      let accountId = editingId;
      if (editingId) {
        await paymentAccountsApi.updateEmployerPaymentAccount(organizationId, employerId, editingId, { ...form, isDefault: true });
      } else {
        const created = await paymentAccountsApi.createEmployerPaymentAccount(organizationId, employerId, { ...form, isDefault: true });
        accountId = created.id;
      }
      if (accountId) {
        await paymentAccountsApi.updateEmployerPaymentMandate(organizationId, employerId, accountId, {
          status: mandateStatus,
          externalMandateId,
          documentId,
        });
      }
      const result = await employersApi.updateEmployerPensionPaymentMode(organizationId, employerId, 1);
      onModeSaved({ ...pensionPayment, mode: result.mode, modeOverridden: result.modeOverridden });
      await loadResolution();
      toast.success("חשבון המעסיק נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת חשבון התשלום נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (loadingChoice) return <div className="empty">טוען חשבון תשלום פנסיוני...</div>;

  const organizationAccount = resolution?.organizationAccount ?? null;
  const directAccount = resolution?.employerAccount ?? null;
  const activeAccount = selectedMode === 2 ? organizationAccount : selectedMode === 1 ? directAccount : null;

  return <section className="card profile-payment-card payment-horizontal-shell">
    <div className="card-head">
      <div><h2>תשלום פנסיוני</h2><span style={{ color: "var(--muted)" }}>בחרו מאיזה חשבון יתבצעו הדיווחים וההפקדות הפנסיוניות של המעסיק.</span></div>
      {pensionPayment.modeOverridden && resolution?.account ? <span className={resolution.source === "Organization" ? "badge badge-blue" : "badge badge-green"}>{resolution.source === "Organization" ? "פעיל: חשבון ארגוני" : "פעיל: חשבון מעסיק"}</span> : null}
    </div>

    <div className="payment-horizontal-layout">
      <aside className="payment-source-column">
        {hasOrganizationContext ?         <UiChoiceCard
          compact
          disabled={!canManage || !organizationAccount}
          selected={selectedMode === 2}
          onClick={selectOrganizationMode}
          tooltip={organizationAccount ? "קיים חשבון ארגוני זמין למעסיק הזה" : "לא קיים חשבון ארגוני זמין למעסיק הזה"}
        >
          <Building2 size={22} />
          <b>חשבון הארגון</b>
          <p>{organizationAccount ? "שימוש בחשבון הפנסיוני שמנוהל ברמת הארגון." : "לא קיים כרגע חשבון ארגוני זמין."}</p>
          {organizationAccount ? <Tooltip content="קיים חשבון ארגוני זמין למעסיק הזה"><span className="option-hint">ⓘ קיים חשבון ארגוני</span></Tooltip> : null}
        </UiChoiceCard> : null}

        <UiChoiceCard
          compact
          disabled={!canManage}
          selected={selectedMode === 1}
          onClick={() => void selectEmployerMode()}
        >
          <WalletCards size={22} />
          <b>חשבון המעסיק</b>
          <p>חשבון ייעודי למעסיק הזה בלבד.</p>
        </UiChoiceCard>
      </aside>

      <div className="payment-details-column">
        {selectedMode === null ? <div className="payment-placeholder">
          <WalletCards size={30} />
          <b>בחרו מקור לחשבון התשלום</b>
          <span>לא נשמר שינוי עד ללחיצה על שמירה.</span>
        </div> : null}

        {selectedMode === 2 && organizationAccount ? <>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>הארגון</strong></div>
            <span className={organizationAccount.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(organizationAccount.mandate?.status)}</span>
          </div>
          <div className="payment-account-details payment-account-details-wide compact-account-details">
            <span><b>בנק וסניף</b><small>בנק {organizationAccount.bankId} · סניף {organizationAccount.branchId}</small></span>
            <span><b>מספר חשבון</b><small dir="ltr">{organizationAccount.maskedAccountNumber}</small></span>
            <span><b>בעל החשבון</b><small>{organizationAccount.accountHolderName}</small></span>
            <span><b>מזהה בעל החשבון</b><small dir="ltr">{organizationAccount.maskedAccountHolderId}</small></span>
          </div>
          {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={saving} onClick={() => void saveOrganizationMode()}><Save size={17} />{saving ? "שומר..." : "שמירת בחירה"}</button></div> : null}
        </> : null}

        {selectedMode === 1 && directAccount && !editingEmployerAccount ? <>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>המעסיק</strong><small>{directAccount.accountHolderName}</small></div>
            <span className={directAccount.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(directAccount.mandate?.status)}</span>
          </div>
          <div className="payment-account-details payment-account-details-wide compact-account-details">
            <span><b>בנק וסניף</b><small>בנק {directAccount.bankId} · סניף {directAccount.branchId}</small></span>
            <span><b>מספר חשבון</b><small dir="ltr">{directAccount.maskedAccountNumber}</small></span>
            <span><b>בעל החשבון</b><small>{directAccount.accountHolderName}</small></span>
            <span><b>מזהה בעל החשבון</b><small dir="ltr">{directAccount.maskedAccountHolderId}</small></span>
          </div>
          {canManage ? <div className="form-actions"><span /><button className="btn btn-secondary" type="button" onClick={() => void startEmployerAccountEdit()}>עריכת החשבון</button></div> : null}
        </> : null}

        {selectedMode === 1 && (!directAccount || editingEmployerAccount) ? <form className="form compact-payment-form" onSubmit={saveEmployerMode}>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>המעסיק</strong></div>
            {directAccount ? <span className={directAccount.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(directAccount.mandate?.status)}</span> : <span className="badge badge-gray">טרם נשמר</span>}
          </div>
          <div className="grid compact-payment-grid">
            <div className="field">
              <label>בנק *</label>
              <UiAutocomplete required value={bankSearch} ariaLabel="בחירת בנק" onOpenChange={setBankOpen} placeholder="שם או מספר בנק" emptyText="לא נמצאו בנקים." options={banks.map((bank) => ({ value: String(bank.bankCode), label: `${bank.bankCode} - ${bank.bankName}` }))} onClear={() => { setForm((current) => ({ ...current, bankId: 0, branchId: 0 })); setBranchSearch(""); setBranches([]); }} onValueChange={(value) => { setBankSearch(value); const selected = banks.find((bank) => value === `${bank.bankCode} - ${bank.bankName}`); setForm((current) => ({ ...current, bankId: selected?.bankCode ?? 0, branchId: 0 })); setBranchSearch(""); }} />
            </div>
            <div className="field">
              <label>סניף *</label>
              <UiAutocomplete required disabled={!form.bankId} value={branchSearch} ariaLabel="בחירת סניף" onOpenChange={setBranchOpen} placeholder="סניף או עיר" emptyText="לא נמצאו סניפים." options={branches.map((branch) => ({ value: String(branch.branchCode), label: `${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}` }))} onClear={() => setForm((current) => ({ ...current, branchId: 0 }))} onValueChange={(value) => { setBranchSearch(value); const selected = branches.find((branch) => value === `${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`); setForm((current) => ({ ...current, branchId: selected?.branchCode ?? 0 })); }} />
            </div>
            <div className="field"><label>מספר חשבון *</label><UiInput required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>שם בעל החשבון *</label><UiInput required maxLength={150} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></div>
            <div className="field"><label>ת״ז / ח.פ. *</label><UiInput required inputMode="numeric" maxLength={20} value={form.accountHolderId} onChange={(e) => setForm({ ...form, accountHolderId: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>סטטוס הרשאה</label><UiSelect value={mandateStatus} onChange={(e) => setMandateStatus(Number(e.target.value) as BankDebitMandateStatus)}><option value={1}>ממתינה</option><option value={2}>פעילה</option><option value={3}>נדחתה</option><option value={4}>בוטלה</option><option value={5}>פגה</option></UiSelect></div>
            <div className="field"><label>מזהה הרשאה</label><UiInput maxLength={120} value={externalMandateId} onChange={(e) => setExternalMandateId(e.target.value)} /></div>
            <div className="field"><label>מסמך הרשאה</label><UiInput maxLength={200} value={documentId} onChange={(e) => setDocumentId(e.target.value)} /></div>
          </div>
          {canManage ? <div className="form-actions">{directAccount ? <button className="btn btn-secondary" type="button" onClick={() => setEditingEmployerAccount(false)}>ביטול</button> : <span />}<button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : directAccount ? "שמירת שינויים" : "שמירת חשבון"}</button></div> : null}
        </form> : null}

        {!canManage && activeAccount ? <div className="notice notice-info">החשבון מוצג לקריאה בלבד לפי ההרשאה שלך.</div> : null}
      </div>
    </div>
  </section>;
}
export function mandateLabel(status: BankDebitMandateStatus | undefined) {
  if (status === 2) return "הרשאה פעילה";
  if (status === 3) return "הרשאה נדחתה";
  if (status === 4) return "הרשאה בוטלה";
  if (status === 5) return "הרשאה פגה";
  return "הרשאה ממתינה";
}
