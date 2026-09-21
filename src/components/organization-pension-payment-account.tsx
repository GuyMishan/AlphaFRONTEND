"use client";

import { useEffect, useState } from "react";
import { Save, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import { UiChoiceCard, UiInput, UiSelect } from "@/components/ui-controls";
import type {
  BankBranchOption,
  BankDebitMandateStatus,
  BankOption,
  EmployerPaymentAccount,
  EmployerPaymentAccountInput,
} from "@/lib/types";

const EMPTY: EmployerPaymentAccountInput = {
  bankId: 0,
  branchId: 0,
  accountNumber: "",
  accountHolderName: "",
  accountHolderId: "",
  isDefault: true,
};

export function OrganizationPensionPaymentAccount({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  const [account, setAccount] = useState<EmployerPaymentAccount | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EmployerPaymentAccountInput>(EMPTY);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [mandateStatus, setMandateStatus] = useState<BankDebitMandateStatus>(1);
  const [externalMandateId, setExternalMandateId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await alphaApi.organizationPaymentAccount(organizationId);
      setAccount(result.account);
      setEditing(!result.account && canManage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת חשבון התשלום הארגוני נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      alphaApi.banks(bankSearch.trim(), 50).then(setBanks).catch(() => setBanks([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [bankSearch]);

  useEffect(() => {
    if (!form.bankId) { setBranches([]); return; }
    const timer = window.setTimeout(() => {
      alphaApi.bankBranches(form.bankId, branchSearch.trim(), 100).then(setBranches).catch(() => setBranches([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [form.bankId, branchSearch]);

  async function startEdit() {
    if (!canManage) return;
    if (!account) {
      setForm(EMPTY);
      setBankSearch("");
      setBranchSearch("");
      setMandateStatus(1);
      setExternalMandateId("");
      setDocumentId("");
      setEditing(true);
      return;
    }

    try {
      const full = await alphaApi.organizationPaymentAccountEdit(organizationId, account.id);
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
      setEditing(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת החשבון לעריכה נכשלה");
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    if (form.bankId <= 0 || form.branchId <= 0 || !form.accountNumber || !form.accountHolderName.trim() || !form.accountHolderId) {
      toast.error("יש למלא בנק, סניף, מספר חשבון ופרטי בעל החשבון.");
      return;
    }
    setSaving(true);
    try {
      const saved = account
        ? await alphaApi.updateOrganizationPaymentAccount(organizationId, account.id, { ...form, isDefault: true })
        : await alphaApi.createOrganizationPaymentAccount(organizationId, { ...form, isDefault: true });

      await alphaApi.updateOrganizationPaymentMandate(organizationId, saved.id, {
        status: mandateStatus,
        externalMandateId,
        documentId,
      });
      setEditing(false);
      await load();
      toast.success("חשבון התשלום הפנסיוני הארגוני נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת החשבון נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">טוען חשבון תשלום פנסיוני...</div>;

  return <section className="card profile-payment-card payment-horizontal-shell organization-payment-card">
    <div className="card-head">
      <div>
        <h2>תשלום פנסיוני</h2>
        <span style={{ color: "var(--muted)" }}>חשבון ברירת המחדל של הארגון עבור מעסיקים שמוגדרים להשתמש בחשבון הארגוני.</span>
      </div>
      {account ? <span className={account.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(account.mandate?.status)}</span> : null}
    </div>

    <div className="payment-horizontal-layout">
      <aside className="payment-source-column">
        <UiChoiceCard compact selected>
          <WalletCards size={22} />
          <b>חשבון הארגון</b>
          <p>חשבון התשלום הפנסיוני המרכזי של הארגון.</p>
          {account ? <span className="option-hint">מוגדר חשבון ארגוני</span> : <span className="option-hint">טרם הוגדר חשבון</span>}
        </UiChoiceCard>
      </aside>

      <div className="payment-details-column">
        {!editing && account ? <>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>הארגון</strong><small>{account.accountHolderName}</small></div>
            <span className={account.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(account.mandate?.status)}</span>
          </div>
          <div className="payment-account-details payment-account-details-wide compact-account-details">
            <span><b>בנק וסניף</b><small>בנק {account.bankId} · סניף {account.branchId}</small></span>
            <span><b>מספר חשבון</b><small>{account.maskedAccountNumber}</small></span>
            <span><b>בעל החשבון</b><small>{account.accountHolderName}</small></span>
            <span><b>מזהה בעל החשבון</b><small>{account.maskedAccountHolderId}</small></span>
          </div>
          {canManage ? <div className="form-actions"><span /><button className="btn btn-secondary" type="button" onClick={() => void startEdit()}>עריכת החשבון</button></div> : null}
        </> : null}

        {!editing && !account ? <div className="payment-placeholder">
          <WalletCards size={30} />
          <b>עדיין לא הוגדר חשבון תשלום פנסיוני</b>
          <span>הגדירו חשבון ארגוני שישמש את המעסיקים שבוחרים מקור ארגוני.</span>
          {canManage ? <button className="btn btn-primary" type="button" onClick={() => void startEdit()}>הגדרת חשבון</button> : null}
        </div> : null}

        {editing ? <form className="form compact-payment-form organization-payment-form" onSubmit={save}>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>הארגון</strong></div>
            <span className="badge badge-gray">{account ? "עריכה" : "חשבון חדש"}</span>
          </div>
          <div className="grid compact-payment-grid">
            <div className="field">
              <label>בנק *</label>
              <UiInput list="organization-payment-banks" placeholder="שם או מספר בנק" value={bankSearch} onChange={(e) => {
                const value = e.target.value;
                setBankSearch(value);
                const code = Number(value.split(" - ")[0]);
                setForm((current) => ({ ...current, bankId: Number.isFinite(code) ? code : 0, branchId: 0 }));
                setBranchSearch("");
              }} />
              <datalist id="organization-payment-banks">{banks.map((bank) => <option key={bank.bankCode} value={`${bank.bankCode} - ${bank.bankName}`} />)}</datalist>
            </div>
            <div className="field">
              <label>סניף *</label>
              <UiInput list="organization-payment-branches" disabled={!form.bankId} placeholder="סניף או עיר" value={branchSearch} onChange={(e) => {
                const value = e.target.value;
                setBranchSearch(value);
                const code = Number(value.split(" - ")[0]);
                setForm((current) => ({ ...current, branchId: Number.isFinite(code) ? code : 0 }));
              }} />
              <datalist id="organization-payment-branches">{branches.map((branch) => <option key={branch.branchCode} value={`${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`} />)}</datalist>
            </div>
            <div className="field"><label>מספר חשבון *</label><UiInput required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>שם בעל החשבון *</label><UiInput required maxLength={150} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></div>
            <div className="field"><label>ת״ז / ח.פ. *</label><UiInput required inputMode="numeric" maxLength={20} value={form.accountHolderId} onChange={(e) => setForm({ ...form, accountHolderId: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>סטטוס הרשאה</label><UiSelect value={mandateStatus} onChange={(e) => setMandateStatus(Number(e.target.value) as BankDebitMandateStatus)}><option value={1}>ממתינה</option><option value={2}>פעילה</option><option value={3}>נדחתה</option><option value={4}>בוטלה</option><option value={5}>פגה</option></UiSelect></div>
            <div className="field"><label>מזהה הרשאה חיצוני</label><UiInput maxLength={120} value={externalMandateId} onChange={(e) => setExternalMandateId(e.target.value)} /></div>
            <div className="field"><label>הפניה למסמך הרשאה</label><UiInput maxLength={200} value={documentId} onChange={(e) => setDocumentId(e.target.value)} /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>ביטול</button>
            <button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירה"}</button>
          </div>
        </form> : null}
      </div>
    </div>
  </section>;
}

function mandateLabel(status: BankDebitMandateStatus | undefined) {
  if (status === 2) return "הרשאה פעילה";
  if (status === 3) return "הרשאה נדחתה";
  if (status === 4) return "הרשאה בוטלה";
  if (status === 5) return "הרשאה פגה";
  return "הרשאה ממתינה";
}
