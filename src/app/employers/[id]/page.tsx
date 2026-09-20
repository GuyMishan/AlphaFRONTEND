"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CreditCard, FileSliders, Plus, Save, Trash2, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AlphaBillingAccountForm } from "@/components/alpha-billing-account-form";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import type {
  BankDebitMandateStatus,
  BankBranchOption,
  BankOption,
  Employee,
  Employer,
  EmployerAddressSettings,
  EmployerBillingResolution,
  EmployerCapabilities,
  EmployerPaymentAccount,
  EmployerPaymentAccountInput,
  EmployerProfileCenterSettings,
} from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";

type TabKey = "general" | "employees" | "pension-payment" | "billing" | "reporting";

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "general", label: "פרטים כלליים", icon: Building2 },
  { key: "employees", label: "עובדים", icon: Users },
  { key: "pension-payment", label: "תשלום פנסיוני", icon: WalletCards },
  { key: "billing", label: "חיוב Alpha", icon: CreditCard },
  { key: "reporting", label: "הגדרות דיווח", icon: FileSliders },
];

const EMPTY_CAPABILITIES: EmployerCapabilities = {
  canManageEmployer: false,
  canEditEmployer: false,
  canCreateEmployee: false,
  canEditEmployee: false,
  canCreateReport: false,
  canTransmitReport: false,
};

const EMPTY_SETTINGS: EmployerProfileCenterSettings = {
  address: { city: "", street: "", houseNumber: "", apartment: "", postalCode: "", postOfficeBox: "" },
  billing: { mode: 1, modeOverridden: false, status: 1, canChangeMode: false },
  reporting: {
    defaultSalaryPaymentDay: null,
    defaultPaymentMethodCode: null,
    defaultEmployerAccountType: null,
    defaultReceiverAccountType: null,
    reportingNotes: "",
  },
};

const EMPTY_ACCOUNT: EmployerPaymentAccountInput = {
  bankId: 0,
  branchId: 0,
  accountNumber: "",
  accountHolderName: "",
  accountHolderId: "",
  isDefault: false,
};

export default function EmployerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useQueryContext();
  const [tab, setTab] = useState<TabKey>("general");
  const [employer, setEmployer] = useState<Employer>();
  const [capabilities, setCapabilities] = useState<EmployerCapabilities>(EMPTY_CAPABILITIES);
  const [settings, setSettings] = useState<EmployerProfileCenterSettings>(EMPTY_SETTINGS);
  const [accounts, setAccounts] = useState<EmployerPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!organizationId || !id) return;
    setLoading(true);
    setError("");
    try {
      const [employerRow, capabilityRow, settingsRow, accountRows] = await Promise.all([
        alphaApi.employer(organizationId, id),
        alphaApi.employerCapabilities(organizationId, id),
        alphaApi.employerProfileCenterSettings(organizationId, id),
        alphaApi.employerPaymentAccounts(organizationId, id),
      ]);
      setEmployer(employerRow);
      setCapabilities(capabilityRow);
      setSettings(settingsRow);
      setAccounts(accountRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת פרופיל המעסיק נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId, id]);

  if (loading) return <AppShell title="פרופיל מעסיק" hideScopeController><div className="empty">טוען פרופיל מעסיק...</div></AppShell>;
  if (error || !employer) return <AppShell title="פרופיל מעסיק" hideScopeController><div className="notice notice-error">{error || "המעסיק לא נמצא."}</div></AppShell>;

  return <AppShell title="פרופיל מעסיק" hideScopeController>
    <div className="page-head">
      <div>
        <h1>{employer.legalName}</h1>
        <p>מרכז ניהול המעסיק · ח.פ./עוסק {employer.registrationNumber}</p>
      </div>
    </div>

    <div className="profile-tabs" role="tablist" aria-label="פרופיל מעסיק">
      {tabs.map(({ key, label, icon: Icon }) => <button
        key={key}
        type="button"
        role="tab"
        aria-selected={tab === key}
        className={`profile-tab${tab === key ? " active" : ""}`}
        onClick={() => setTab(key)}
      ><Icon size={17} />{label}</button>)}
    </div>

    {tab === "general" ? <GeneralTab
      organizationId={organizationId}
      employer={employer}
      canEdit={capabilities.canEditEmployer}
      address={settings.address}
      onAddressSaved={(address) => setSettings((current) => ({ ...current, address }))}
    /> : null}

    {tab === "employees" ? <EmployeesTab
      organizationId={organizationId}
      employer={employer}
      canCreate={capabilities.canCreateEmployee}
    /> : null}

    {tab === "pension-payment" ? <PensionPaymentTab
      organizationId={organizationId}
      employerId={employer.id}
      canManage={capabilities.canManageEmployer}
      accounts={accounts}
      setAccounts={setAccounts}
    /> : null}

    {tab === "billing" ? <EmployerBillingInheritanceTab
      organizationId={organizationId}
      employer={employer}
      canManageEmployer={capabilities.canManageEmployer}
      billing={settings.billing}
      onModeSaved={(billing) => setSettings((current) => ({ ...current, billing }))}
    /> : null}

    {tab === "reporting" ? <ReportingTab
      organizationId={organizationId}
      employerId={employer.id}
      canEdit={capabilities.canEditEmployer}
      value={settings.reporting}
      onSaved={(reporting) => setSettings((current) => ({ ...current, reporting }))}
    /> : null}
  </AppShell>;
}

function GeneralTab({ organizationId, employer, canEdit, address, onAddressSaved }: {
  organizationId: string;
  employer: Employer;
  canEdit: boolean;
  address: EmployerAddressSettings;
  onAddressSaved: (value: EmployerAddressSettings) => void;
}) {
  const [form, setForm] = useState(address);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(address), [address]);

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const normalized = {
        ...form,
        postalCode: form.postalCode.replace(/\D/g, ""),
      };
      await alphaApi.updateEmployerAddress(organizationId, employer.id, normalized);
      onAddressSaved(normalized);
      toast.success("כתובת המעסיק נשמרה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת הכתובת נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <div className="employer-profile-stack">
    <EmployerForm organizationId={organizationId} employer={employer} editable={canEdit} showBackLink={false} />
    <section className="card profile-card">
      <div className="card-head"><div><h2>כתובת המעסיק</h2><span style={{ color: "var(--muted)" }}>כתובת העסק לצורכי פרופיל ותפעול.</span></div></div>
      {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הכתובת מוצגת לקריאה בלבד לפי ההרשאה שלך.</div> : null}
      <form className="form" onSubmit={saveAddress}>
        <div className="grid two-cols">
          <div className="field"><label>יישוב</label><input disabled={!canEdit} maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>רחוב</label><input disabled={!canEdit} maxLength={100} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
          <div className="field"><label>מספר בית</label><input disabled={!canEdit} maxLength={20} value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} /></div>
          <div className="field"><label>דירה</label><input disabled={!canEdit} maxLength={20} value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} /></div>
          <div className="field"><label>מיקוד</label><input disabled={!canEdit} inputMode="numeric" maxLength={10} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>תא דואר</label><input disabled={!canEdit} maxLength={20} value={form.postOfficeBox} onChange={(e) => setForm({ ...form, postOfficeBox: e.target.value })} /></div>
        </div>
        {canEdit ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת כתובת"}</button></div> : null}
      </form>
    </section>
  </div>;
}

function EmployeesTab({ organizationId, employer, canCreate }: { organizationId: string; employer: Employer; canCreate: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      alphaApi.employeeSearch(organizationId, employer.id, search.trim(), 0, 100)
        .then((result) => setEmployees(result.items))
        .catch((err) => toast.error(err instanceof Error ? err.message : "טעינת העובדים נכשלה"))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [organizationId, employer.id, search]);

  return <section className="card">
    <div className="card-head">
      <div><h2>עובדים</h2><span style={{ color: "var(--muted)" }}>עובדי המעסיק וקישורים לפרופילים שלהם.</span></div>
      {canCreate ? <Link className="btn btn-primary" href={`/employees/new?organizationId=${organizationId}&employerId=${employer.id}`}><Plus size={17} />עובד חדש</Link> : null}
    </div>
    <div className="toolbar"><div className="search"><input aria-label="חיפוש עובדים" placeholder="חיפוש לפי שם, תעודת זהות או מספר עובד" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
    {loading ? <div className="empty">טוען עובדים...</div> : employees.length === 0 ? <div className="empty">לא נמצאו עובדים אצל המעסיק.</div> :
      <div className="table-wrap"><table><thead><tr><th>עובד</th><th>תעודת זהות</th><th>מספר עובד</th><th>סטטוס</th><th /></tr></thead><tbody>
        {employees.map((employee) => <tr key={employee.id}>
          <td><b>{employee.firstName} {employee.lastName}</b></td>
          <td>{employee.nationalId}</td>
          <td>{employee.employeeNumber}</td>
          <td>{employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"}</td>
          <td><Link className="profile-link" href={`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employer.id}`}>לפרופיל</Link></td>
        </tr>)}
      </tbody></table></div>}
  </section>;
}

function PensionPaymentTab({ organizationId, employerId, canManage, accounts, setAccounts }: {
  organizationId: string;
  employerId: string;
  canManage: boolean;
  accounts: EmployerPaymentAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<EmployerPaymentAccount[]>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployerPaymentAccountInput>(EMPTY_ACCOUNT);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [mandateStatus, setMandateStatus] = useState<BankDebitMandateStatus>(1);
  const [externalMandateId, setExternalMandateId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [saving, setSaving] = useState(false);

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

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_ACCOUNT, isDefault: accounts.length === 0 });
    setBankSearch("");
    setBranchSearch("");
    setMandateStatus(1);
    setExternalMandateId("");
    setDocumentId("");
  }

  async function edit(item: EmployerPaymentAccount) {
    if (!canManage) return;
    try {
      const full = await alphaApi.employerPaymentAccount(organizationId, employerId, item.id);
      setEditingId(item.id);
      setForm({
        bankId: full.bankId,
        branchId: full.branchId,
        accountNumber: full.accountNumber,
        accountHolderName: full.accountHolderName,
        accountHolderId: full.accountHolderId,
        isDefault: full.isDefault,
      });
      setBankSearch(String(full.bankId));
      setBranchSearch(String(full.branchId));
      setMandateStatus(full.mandate?.status ?? 1);
      setExternalMandateId(full.mandate?.externalMandateId ?? "");
      setDocumentId(full.mandate?.documentId ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת החשבון לעריכה נכשלה");
    }
  }

  async function reload() {
    setAccounts(await alphaApi.employerPaymentAccounts(organizationId, employerId));
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
      let accountId = editingId;
      if (editingId) {
        await alphaApi.updateEmployerPaymentAccount(organizationId, employerId, editingId, form);
      } else {
        const created = await alphaApi.createEmployerPaymentAccount(organizationId, employerId, form);
        accountId = created.id;
      }
      if (accountId) {
        await alphaApi.updateEmployerPaymentMandate(organizationId, employerId, accountId, {
          status: mandateStatus,
          externalMandateId,
          documentId,
        });
      }
      await reload();
      resetForm();
      toast.success(editingId ? "חשבון התשלום עודכן" : "חשבון התשלום נוסף");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת חשבון התשלום נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string) {
    try {
      await alphaApi.setDefaultEmployerPaymentAccount(organizationId, employerId, id);
      await reload();
      toast.success("חשבון ברירת המחדל עודכן");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון ברירת המחדל נכשל");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("להשבית את חשבון התשלום הזה?")) return;
    try {
      await alphaApi.deactivateEmployerPaymentAccount(organizationId, employerId, id);
      await reload();
      if (editingId === id) resetForm();
      toast.success("חשבון התשלום הושבת");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "השבתת החשבון נכשלה");
    }
  }

  return <div className="employer-profile-stack">
    <section className="card">
      <div className="card-head">
        <div><h2>חשבונות לתשלומים פנסיוניים</h2><span style={{ color: "var(--muted)" }}>חשבונות הבנק של המעסיק שמהם ממומנות ההפקדות הפנסיוניות. לא קשור לחיוב Alpha.</span></div>
        {canManage ? <button className="btn btn-secondary" type="button" onClick={resetForm}><Plus size={17} />חשבון חדש</button> : null}
      </div>
      {accounts.length === 0 ? <div className="empty">עדיין לא הוגדר חשבון תשלום פנסיוני.</div> : <div className="payment-account-grid">
        {accounts.map((item) => <article className="payment-account-card" key={item.id}>
          <div className="payment-account-head">
            <div><b>{item.accountHolderName}</b>{item.isDefault ? <span className="badge badge-blue">ברירת מחדל</span> : null}</div>
            <span className={item.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(item.mandate?.status)}</span>
          </div>
          <div className="payment-account-details">
            <span>בנק {item.bankId} · סניף {item.branchId}</span>
            <span>חשבון {item.maskedAccountNumber}</span>
            <span>בעל חשבון {item.maskedAccountHolderId}</span>
            {item.mandate?.externalMandateId ? <span>מזהה הרשאה: {item.mandate.externalMandateId}</span> : null}
          </div>
          {canManage ? <div className="payment-account-actions">
            <button className="btn btn-secondary" type="button" onClick={() => void edit(item)}>עריכה</button>
            {!item.isDefault ? <button className="btn btn-soft" type="button" onClick={() => void setDefault(item.id)}>הגדר כברירת מחדל</button> : null}
            <button className="btn btn-danger" type="button" onClick={() => void remove(item.id)}><Trash2 size={15} />השבתה</button>
          </div> : null}
        </article>)}
      </div>}
    </section>

    {canManage ? <section className="card">
      <div className="card-head"><div><h2>{editingId ? "עריכת חשבון" : "הוספת חשבון"}</h2><span style={{ color: "var(--muted)" }}>המספר המלא זמין רק במסך העריכה למשתמש בעל הרשאת ניהול.</span></div></div>
      <form className="form" onSubmit={save}>
        <div className="grid two-cols">
          <div className="field">
            <label>בנק *</label>
            <input list="employer-payment-banks" placeholder="חיפוש לפי שם או מספר בנק" value={bankSearch} onChange={(e) => {
              const value = e.target.value;
              setBankSearch(value);
              const code = Number(value.split(" - ")[0]);
              setForm((current) => ({ ...current, bankId: Number.isFinite(code) ? code : 0, branchId: 0 }));
              setBranchSearch("");
            }} />
            <datalist id="employer-payment-banks">{banks.map((bank) => <option key={bank.bankCode} value={`${bank.bankCode} - ${bank.bankName}`} />)}</datalist>
          </div>
          <div className="field">
            <label>סניף *</label>
            <input list="employer-payment-branches" disabled={!form.bankId} placeholder="חיפוש לפי סניף או עיר" value={branchSearch} onChange={(e) => {
              const value = e.target.value;
              setBranchSearch(value);
              const code = Number(value.split(" - ")[0]);
              setForm((current) => ({ ...current, branchId: Number.isFinite(code) ? code : 0 }));
            }} />
            <datalist id="employer-payment-branches">{branches.map((branch) => <option key={branch.branchCode} value={`${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`} />)}</datalist>
          </div>
          <div className="field"><label>מספר חשבון *</label><input required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>שם בעל החשבון *</label><input required maxLength={150} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></div>
          <div className="field"><label>ת״ז / ח.פ. בעל החשבון *</label><input required inputMode="numeric" maxLength={20} value={form.accountHolderId} onChange={(e) => setForm({ ...form, accountHolderId: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>סטטוס הרשאה לחיוב</label><select value={mandateStatus} onChange={(e) => setMandateStatus(Number(e.target.value) as BankDebitMandateStatus)}><option value={1}>ממתינה</option><option value={2}>פעילה</option><option value={3}>נדחתה</option><option value={4}>בוטלה</option><option value={5}>פגה</option></select></div>
          <div className="field"><label>מזהה הרשאה חיצוני</label><input maxLength={120} value={externalMandateId} onChange={(e) => setExternalMandateId(e.target.value)} /></div>
          <div className="field"><label>הפניה למסמך הרשאה</label><input maxLength={200} value={documentId} onChange={(e) => setDocumentId(e.target.value)} /></div>
        </div>
        {!editingId ? <label className="check-row"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />הגדר כחשבון ברירת המחדל</label> : null}
        <div className="form-actions"><button className="btn btn-secondary" type="button" onClick={resetForm}>ניקוי</button><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירה"}</button></div>
      </form>
    </section> : <div className="notice notice-info">לפי ההרשאה שלך ניתן לצפות בחשבונות ובסטטוס ההרשאה בלבד.</div>}
  </div>;
}

function EmployerBillingInheritanceTab({ organizationId, employer, canManageEmployer, billing, onModeSaved }: {
  organizationId: string;
  employer: Employer;
  canManageEmployer: boolean;
  billing: EmployerProfileCenterSettings["billing"];
  onModeSaved: (value: EmployerProfileCenterSettings["billing"]) => void;
}) {
  const [resolution, setResolution] = useState<EmployerBillingResolution | null>(null);
  const [mode, setMode] = useState(billing.mode);
  const [savingMode, setSavingMode] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadResolution() {
    setLoading(true);
    try {
      const value = await alphaApi.employerBillingResolution(organizationId, employer.id);
      setResolution(value);
      setMode(value.billingMode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הגדרת החיוב נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadResolution(); }, [organizationId, employer.id]);

  async function saveMode(nextMode: 1 | 2) {
    if (!billing.canChangeMode) return;
    setSavingMode(true);
    try {
      const result = await alphaApi.updateEmployerBilling(organizationId, employer.id, nextMode);
      const nextBilling = { ...billing, mode: result.billingMode, modeOverridden: true };
      onModeSaved(nextBilling);
      setMode(result.billingMode);
      await loadResolution();
      toast.success("אופן החיוב של המעסיק עודכן");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון אופן החיוב נכשל");
    } finally {
      setSavingMode(false);
    }
  }

  if (loading || !resolution) return <div className="empty">טוען הגדרות חיוב...</div>;

  return <div className="employer-profile-stack">
    <section className="card">
      <div className="card-head">
        <div><h2>אופן חיוב Alpha</h2><span style={{ color: "var(--muted)" }}>קובע מי מחויב עבור השימוש של {employer.legalName} במערכת.</span></div>
        {billing.modeOverridden ? <span className="badge badge-blue">Override</span> : <span className="badge badge-gray">ברירת מחדל</span>}
      </div>

      <div className="grid two-cols">
        <button
          type="button"
          disabled={!billing.canChangeMode || savingMode}
          className={`choice-card${mode === 2 ? " selected" : ""}`}
          onClick={() => void saveMode(2)}
        >
          <Building2 size={24} />
          <b>חיוב דרך הארגון</b>
          <p>המעסיק משתמש ב־Billing Account של הארגון.</p>
        </button>
        <button
          type="button"
          disabled={!billing.canChangeMode || savingMode}
          className={`choice-card${mode === 1 ? " selected" : ""}`}
          onClick={() => void saveMode(1)}
        >
          <CreditCard size={24} />
          <b>חיוב עצמאי</b>
          <p>המעסיק משתמש ב־Billing Account נפרד משלו.</p>
        </button>
      </div>

      {!billing.canChangeMode ? <div className="notice notice-info" style={{ marginTop: 18 }}>רק Organization Admin יכול לשנות את אופן החיוב.</div> : null}

      <div className="notice notice-info" style={{ marginTop: 18 }}>
        <b>מחויב דרך: {resolution.billedThroughName}</b>
        <div>{resolution.source === "Organization" ? "Billing Account ארגוני" : "Billing Account עצמאי של המעסיק"} · {resolution.effectiveAccount.configured ? "מוגדר" : "עדיין לא הוגדר"}</div>
      </div>
    </section>

    {resolution.source === "Organization"
      ? <AlphaBillingAccountForm organizationId={organizationId} canManage={false} />
      : <AlphaBillingAccountForm organizationId={organizationId} employerId={employer.id} canManage={canManageEmployer} />}
  </div>;
}

function ReportingTab({ organizationId, employerId, canEdit, value, onSaved }: {
  organizationId: string;
  employerId: string;
  canEdit: boolean;
  value: EmployerProfileCenterSettings["reporting"];
  onSaved: (value: EmployerProfileCenterSettings["reporting"]) => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await alphaApi.updateEmployerReportingSettings(organizationId, employerId, form);
      onSaved(form);
      toast.success("הגדרות הדיווח נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת הגדרות הדיווח נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card">
    <div className="card-head"><div><h2>הגדרות דיווח</h2><span style={{ color: "var(--muted)" }}>ברירות מחדל שישמשו את תהליכי הדיווח של המעסיק.</span></div></div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הגדרות הדיווח מוצגות לקריאה בלבד לפי ההרשאה שלך.</div> : null}
    <form className="form" onSubmit={save}>
      <div className="grid two-cols">
        <div className="field"><label>יום ברירת מחדל לתשלום שכר</label><input disabled={!canEdit} type="number" min={1} max={31} value={form.defaultSalaryPaymentDay ?? ""} onChange={(e) => setForm({ ...form, defaultSalaryPaymentDay: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="field"><label>קוד אמצעי תשלום ברירת מחדל</label><input disabled={!canEdit} type="number" min={0} value={form.defaultPaymentMethodCode ?? ""} onChange={(e) => setForm({ ...form, defaultPaymentMethodCode: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="field"><label>סוג חשבון מעסיק ברירת מחדל</label><input disabled={!canEdit} type="number" min={0} value={form.defaultEmployerAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultEmployerAccountType: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="field"><label>סוג חשבון מקבל ברירת מחדל</label><input disabled={!canEdit} type="number" min={0} value={form.defaultReceiverAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultReceiverAccountType: e.target.value ? Number(e.target.value) : null })} /></div>
      </div>
      <div className="field"><label>הערות תפעוליות לדיווח</label><textarea disabled={!canEdit} maxLength={500} value={form.reportingNotes} onChange={(e) => setForm({ ...form, reportingNotes: e.target.value })} /></div>
      {canEdit ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת הגדרות"}</button></div> : null}
    </form>
  </section>;
}

function mandateLabel(status: BankDebitMandateStatus | undefined) {
  if (status === 2) return "הרשאה פעילה";
  if (status === 3) return "הרשאה נדחתה";
  if (status === 4) return "הרשאה בוטלה";
  if (status === 5) return "הרשאה פגה";
  return "הרשאה ממתינה";
}
