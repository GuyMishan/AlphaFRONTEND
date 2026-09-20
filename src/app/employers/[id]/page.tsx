"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CreditCard, FileSliders, Plus, Save, Trash2, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type {
  DebitAuthorizationStatus,
  Employee,
  Employer,
  EmployerAddressSettings,
  EmployerBillingMode,
  EmployerBillingStatus,
  EmployerCapabilities,
  EmployerPensionPaymentAccount,
  EmployerPensionPaymentAccountInput,
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
  billing: { mode: 1, status: 1 },
  reporting: {
    defaultSalaryPaymentDay: null,
    defaultPaymentMethodCode: null,
    defaultEmployerAccountType: null,
    defaultReceiverAccountType: null,
    reportingNotes: "",
  },
};

const EMPTY_ACCOUNT: EmployerPensionPaymentAccountInput = {
  accountName: "",
  bankCode: 0,
  branchCode: 0,
  accountNumber: "",
  accountHolderName: "",
  isDefault: false,
  debitAuthorizationStatus: 1,
};

export default function EmployerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useQueryContext();
  const [tab, setTab] = useState<TabKey>("general");
  const [employer, setEmployer] = useState<Employer>();
  const [capabilities, setCapabilities] = useState<EmployerCapabilities>(EMPTY_CAPABILITIES);
  const [settings, setSettings] = useState<EmployerProfileCenterSettings>(EMPTY_SETTINGS);
  const [accounts, setAccounts] = useState<EmployerPensionPaymentAccount[]>([]);
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
        alphaApi.employerPensionPaymentAccounts(organizationId, id),
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

    {tab === "billing" ? <BillingTab
      organizationId={organizationId}
      employerId={employer.id}
      canManage={capabilities.canManageEmployer}
      value={settings.billing}
      onSaved={(billing) => setSettings((current) => ({ ...current, billing }))}
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
  accounts: EmployerPensionPaymentAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<EmployerPensionPaymentAccount[]>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployerPensionPaymentAccountInput>(EMPTY_ACCOUNT);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setEditingId(null);
    setForm({ ...EMPTY_ACCOUNT, isDefault: accounts.length === 0 });
  }

  function edit(item: EmployerPensionPaymentAccount) {
    setEditingId(item.id);
    setForm({
      accountName: item.accountName,
      bankCode: item.bankCode,
      branchCode: item.branchCode,
      accountNumber: item.accountNumber,
      accountHolderName: item.accountHolderName,
      isDefault: item.isDefault,
      debitAuthorizationStatus: item.debitAuthorizationStatus,
    });
  }

  async function reload() {
    setAccounts(await alphaApi.employerPensionPaymentAccounts(organizationId, employerId));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    if (!form.accountName.trim() || form.bankCode <= 0 || form.branchCode <= 0 || !form.accountNumber.trim() || !form.accountHolderName.trim()) {
      toast.error("יש למלא את כל פרטי החשבון.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) await alphaApi.updateEmployerPensionPaymentAccount(organizationId, employerId, editingId, form);
      else await alphaApi.createEmployerPensionPaymentAccount(organizationId, employerId, form);
      await reload();
      startNew();
      toast.success(editingId ? "חשבון התשלום עודכן" : "חשבון התשלום נוסף");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת חשבון התשלום נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("למחוק את חשבון התשלום הזה?")) return;
    try {
      await alphaApi.deleteEmployerPensionPaymentAccount(organizationId, employerId, id);
      await reload();
      if (editingId === id) startNew();
      toast.success("חשבון התשלום נמחק");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקת החשבון נכשלה");
    }
  }

  return <div className="employer-profile-stack">
    <section className="card">
      <div className="card-head"><div><h2>חשבונות להפקדות פנסיוניות</h2><span style={{ color: "var(--muted)" }}>ניהול החשבונות שמהם יתבצעו תשלומים והפקדות.</span></div>{canManage ? <button className="btn btn-secondary" type="button" onClick={startNew}><Plus size={17} />חשבון חדש</button> : null}</div>
      {accounts.length === 0 ? <div className="empty">עדיין לא הוגדר חשבון תשלום.</div> : <div className="payment-account-grid">
        {accounts.map((item) => <article className="payment-account-card" key={item.id}>
          <div className="payment-account-head"><div><b>{item.accountName}</b>{item.isDefault ? <span className="badge badge-blue">ברירת מחדל</span> : null}</div><span>{authorizationLabel(item.debitAuthorizationStatus)}</span></div>
          <div className="payment-account-details"><span>בנק {item.bankCode}</span><span>סניף {item.branchCode}</span><span>חשבון {item.accountNumber}</span><span>{item.accountHolderName}</span></div>
          {canManage ? <div className="payment-account-actions"><button className="btn btn-secondary" type="button" onClick={() => edit(item)}>עריכה</button><button className="btn btn-danger" type="button" onClick={() => void remove(item.id)}><Trash2 size={15} />מחיקה</button></div> : null}
        </article>)}
      </div>}
    </section>

    {canManage ? <section className="card">
      <div className="card-head"><div><h2>{editingId ? "עריכת חשבון" : "הוספת חשבון"}</h2><span style={{ color: "var(--muted)" }}>פרטי הבנק והרשאת החיוב נשמרים ברמת המעסיק.</span></div></div>
      <form className="form" onSubmit={save}>
        <div className="grid two-cols">
          <div className="field"><label>שם החשבון *</label><input required maxLength={100} value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /></div>
          <div className="field"><label>שם בעל החשבון *</label><input required maxLength={150} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></div>
          <div className="field"><label>מספר בנק *</label><input required type="number" min={1} value={form.bankCode || ""} onChange={(e) => setForm({ ...form, bankCode: Number(e.target.value) })} /></div>
          <div className="field"><label>מספר סניף *</label><input required type="number" min={1} value={form.branchCode || ""} onChange={(e) => setForm({ ...form, branchCode: Number(e.target.value) })} /></div>
          <div className="field"><label>מספר חשבון *</label><input required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>הרשאה לחיוב</label><select value={form.debitAuthorizationStatus} onChange={(e) => setForm({ ...form, debitAuthorizationStatus: Number(e.target.value) as DebitAuthorizationStatus })}><option value={1}>לא הוגדרה</option><option value={2}>בתהליך</option><option value={3}>פעילה</option><option value={4}>בוטלה</option></select></div>
        </div>
        <label className="check-row"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />הגדר כחשבון ברירת המחדל</label>
        <div className="form-actions"><button className="btn btn-secondary" type="button" onClick={startNew}>ניקוי</button><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירה"}</button></div>
      </form>
    </section> : <div className="notice notice-info">לפי ההרשאה שלך ניתן לצפות בחשבונות אך לא לשנות אותם.</div>}
  </div>;
}

function BillingTab({ organizationId, employerId, canManage, value, onSaved }: {
  organizationId: string;
  employerId: string;
  canManage: boolean;
  value: EmployerProfileCenterSettings["billing"];
  onSaved: (value: EmployerProfileCenterSettings["billing"]) => void;
}) {
  const platformAdmin = Boolean(getSession()?.platformAdmin);
  const [mode, setMode] = useState<EmployerBillingMode>(value.mode);
  const [status, setStatus] = useState<EmployerBillingStatus>(value.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMode(value.mode); setStatus(value.status); }, [value]);

  async function save() {
    setSaving(true);
    try {
      const result = await alphaApi.updateEmployerBilling(organizationId, employerId, mode, platformAdmin ? status : undefined);
      onSaved({ mode: result.billingMode, status: result.billingStatus });
      toast.success("הגדרות החיוב נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת הגדרות החיוב נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card">
    <div className="card-head"><div><h2>חיוב Alpha</h2><span style={{ color: "var(--muted)" }}>מגדיר האם המעסיק מחויב ישירות או יורש את הגדרות הארגון.</span></div></div>
    {!canManage ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הגדרות החיוב מוצגות לקריאה בלבד לפי ההרשאה שלך.</div> : null}
    <div className="form">
      <div className="field"><label>אופן חיוב</label><select disabled={!canManage} value={mode} onChange={(e) => setMode(Number(e.target.value) as EmployerBillingMode)}><option value={1}>EmployerDirect — חיוב ישיר של המעסיק</option><option value={2}>InheritOrganization — ירושה מהארגון</option></select></div>
      <div className="field"><label>סטטוס Billing</label><select disabled={!platformAdmin} value={status} onChange={(e) => setStatus(Number(e.target.value) as EmployerBillingStatus)}><option value={1}>לא הוגדר</option><option value={2}>פעיל</option><option value={3}>מושהה</option></select><small>{platformAdmin ? "Platform Admin יכול לעדכן את הסטטוס." : "הסטטוס מנוהל ברמת המערכת ומוצג כאן לקריאה."}</small></div>
      {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? "שומר..." : "שמירת הגדרות"}</button></div> : null}
    </div>
  </section>;
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

function authorizationLabel(status: DebitAuthorizationStatus) {
  if (status === 2) return "הרשאה בתהליך";
  if (status === 3) return "הרשאה פעילה";
  if (status === 4) return "הרשאה בוטלה";
  return "ללא הרשאת חיוב";
}
