"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CreditCard, FileSliders, Save, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AlphaBillingAccountForm } from "@/components/alpha-billing-account-form";
import { EmployerEmployeesPanel } from "@/components/employer-employees-panel";
import { alphaApi } from "@/lib/api";
import type {
  BankDebitMandateStatus,
  BankBranchOption,
  BankOption,
  Employer,
  EmployerInput,
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
  pensionPayment: { mode: 2, modeOverridden: false, canChangeMode: false },
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
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && tabs.some((item) => item.key === requestedTab)) setTab(requestedTab as TabKey);
  }, []);
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
      pensionPayment={settings.pensionPayment}
      onModeSaved={(pensionPayment) => setSettings((current) => ({ ...current, pensionPayment }))}
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
  const [details, setDetails] = useState<EmployerInput>({
    legalName: employer.legalName,
    registrationNumber: employer.registrationNumber,
    withholdingFileNumber: employer.withholdingFileNumber,
    contactFirstName: employer.contactFirstName ?? "",
    contactLastName: employer.contactLastName ?? "",
    contactPhone: employer.contactPhone ?? "",
    contactEmail: employer.contactEmail ?? "",
    contactMobile: employer.contactMobile ?? "",
  });
  const [addressForm, setAddressForm] = useState(address);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDetails({
      legalName: employer.legalName,
      registrationNumber: employer.registrationNumber,
      withholdingFileNumber: employer.withholdingFileNumber,
      contactFirstName: employer.contactFirstName ?? "",
      contactLastName: employer.contactLastName ?? "",
      contactPhone: employer.contactPhone ?? "",
      contactEmail: employer.contactEmail ?? "",
      contactMobile: employer.contactMobile ?? "",
    });
  }, [employer]);

  useEffect(() => setAddressForm(address), [address]);

  async function saveAll(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;

    const phone = (details.contactPhone ?? "").replace(/\D/g, "");
    const mobile = (details.contactMobile ?? "").replace(/\D/g, "");
    if (!details.legalName.trim() || !details.registrationNumber.trim() || !details.withholdingFileNumber.trim()) {
      toast.error("יש למלא את פרטי המעסיק החובה.");
      return;
    }
    if (!phone && !mobile) {
      toast.error("יש להזין לפחות טלפון או נייד אחד.");
      return;
    }

    setSaving(true);
    try {
      const employerInput: EmployerInput = {
        ...details,
        legalName: details.legalName.trim(),
        registrationNumber: details.registrationNumber.replace(/\D/g, ""),
        withholdingFileNumber: details.withholdingFileNumber.replace(/\D/g, ""),
        contactFirstName: (details.contactFirstName ?? "").trim(),
        contactLastName: (details.contactLastName ?? "").trim(),
        contactPhone: phone,
        contactEmail: (details.contactEmail ?? "").trim(),
        contactMobile: mobile,
      };
      const normalizedAddress = {
        ...addressForm,
        postalCode: addressForm.postalCode.replace(/\D/g, ""),
      };

      await Promise.all([
        alphaApi.updateEmployer(organizationId, employer.id, employerInput),
        alphaApi.updateEmployerAddress(organizationId, employer.id, normalizedAddress),
      ]);
      onAddressSaved(normalizedAddress);
      toast.success("פרטי המעסיק נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת פרטי המעסיק נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card employer-general-card">
    <div className="card-head">
      <div><h2>פרטים כלליים</h2><span style={{ color: "var(--muted)" }}>פרטי המעסיק, איש הקשר והכתובת במקום אחד.</span></div>
      <span className={employer.status === 2 ? "badge badge-green" : "badge badge-gray"}>{employer.status === 2 ? "פעיל" : "בתהליך הקמה"}</span>
    </div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד לפי ההרשאה שלך.</div> : null}

    <form className="form" onSubmit={saveAll}>
      <div className="profile-form-section">
        <h3>פרטי מעסיק</h3>
        <div className="grid employer-details-grid">
          <div className="field field-span-2"><label>שם משפטי מלא *</label><input disabled={!canEdit} required maxLength={200} value={details.legalName} onChange={(e) => setDetails({ ...details, legalName: e.target.value })} /></div>
          <div className="field"><label>מספר חברה / עוסק *</label><input disabled={!canEdit} required inputMode="numeric" maxLength={15} value={details.registrationNumber} onChange={(e) => setDetails({ ...details, registrationNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>תיק ניכויים *</label><input disabled={!canEdit} required inputMode="numeric" maxLength={9} value={details.withholdingFileNumber} onChange={(e) => setDetails({ ...details, withholdingFileNumber: e.target.value.replace(/\D/g, "") })} /><small>אם אין תיק ניכויים, יש להזין 900000000.</small></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>איש קשר</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>שם פרטי *</label><input disabled={!canEdit} maxLength={20} value={details.contactFirstName ?? ""} onChange={(e) => setDetails({ ...details, contactFirstName: e.target.value })} /></div>
          <div className="field"><label>שם משפחה *</label><input disabled={!canEdit} maxLength={20} value={details.contactLastName ?? ""} onChange={(e) => setDetails({ ...details, contactLastName: e.target.value })} /></div>
          <div className="field"><label>טלפון</label><input disabled={!canEdit} inputMode="numeric" maxLength={11} value={details.contactPhone ?? ""} onChange={(e) => setDetails({ ...details, contactPhone: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>נייד</label><input disabled={!canEdit} inputMode="numeric" maxLength={15} value={details.contactMobile ?? ""} onChange={(e) => setDetails({ ...details, contactMobile: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field field-span-2"><label>אימייל *</label><input disabled={!canEdit} required type="email" maxLength={50} value={details.contactEmail ?? ""} onChange={(e) => setDetails({ ...details, contactEmail: e.target.value })} /></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>כתובת</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>יישוב</label><input disabled={!canEdit} maxLength={100} value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
          <div className="field"><label>רחוב</label><input disabled={!canEdit} maxLength={100} value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} /></div>
          <div className="field"><label>מספר בית</label><input disabled={!canEdit} maxLength={20} value={addressForm.houseNumber} onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })} /></div>
          <div className="field"><label>דירה</label><input disabled={!canEdit} maxLength={20} value={addressForm.apartment} onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })} /></div>
          <div className="field"><label>מיקוד</label><input disabled={!canEdit} inputMode="numeric" maxLength={10} value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>תא דואר</label><input disabled={!canEdit} maxLength={20} value={addressForm.postOfficeBox} onChange={(e) => setAddressForm({ ...addressForm, postOfficeBox: e.target.value })} /></div>
        </div>
      </div>

      {canEdit ? <div className="form-actions single-save-action"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת כל הפרטים"}</button></div> : null}
    </form>
  </section>;
}

function EmployeesTab({ organizationId, employer, canCreate }: { organizationId: string; employer: Employer; canCreate: boolean }) {
  return <EmployerEmployeesPanel organizationId={organizationId} employer={employer} canCreate={canCreate} />;
}

function PensionPaymentTab({ organizationId, employerId, canManage, accounts, setAccounts, pensionPayment, onModeSaved }: {
  organizationId: string;
  employerId: string;
  canManage: boolean;
  accounts: EmployerPaymentAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<EmployerPaymentAccount[]>>;
  pensionPayment: EmployerProfileCenterSettings["pensionPayment"];
  onModeSaved: (value: EmployerProfileCenterSettings["pensionPayment"]) => void;
}) {
  const account = useMemo(() => accounts[0] ?? null, [accounts]);
  const inherited = account?.source === "Organization" || pensionPayment.mode === 2;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creatingOverride, setCreatingOverride] = useState(false);
  const [form, setForm] = useState<EmployerPaymentAccountInput>({ ...EMPTY_ACCOUNT, isDefault: true });
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [mandateStatus, setMandateStatus] = useState<BankDebitMandateStatus>(1);
  const [externalMandateId, setExternalMandateId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

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

  function clearEditor() {
    setEditingId(null);
    setCreatingOverride(false);
    setForm({ ...EMPTY_ACCOUNT, isDefault: true });
    setBankSearch("");
    setBranchSearch("");
    setMandateStatus(1);
    setExternalMandateId("");
    setDocumentId("");
  }

  async function reload() {
    setAccounts(await alphaApi.employerPaymentAccounts(organizationId, employerId));
  }

  async function switchToOrganizationAccount() {
    if (!pensionPayment.canChangeMode) return;
    setSwitching(true);
    try {
      const result = await alphaApi.updateEmployerPensionPaymentMode(organizationId, employerId, 2);
      onModeSaved({ ...pensionPayment, mode: result.mode, modeOverridden: result.modeOverridden });
      clearEditor();
      await reload();
      toast.success("המעסיק משתמש כעת בחשבון הפנסיוני של הארגון");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שינוי מקור החשבון נכשל");
    } finally {
      setSwitching(false);
    }
  }

  async function switchToEmployerAccount() {
    if (!pensionPayment.canChangeMode) return;
    setSwitching(true);
    try {
      const result = await alphaApi.updateEmployerPensionPaymentMode(organizationId, employerId, 1);
      onModeSaved({ ...pensionPayment, mode: result.mode, modeOverridden: result.modeOverridden });
      await reload();
      toast.success("המעסיק משתמש כעת בחשבון עצמאי");
    } catch {
      setCreatingOverride(true);
      setEditingId(null);
      setForm({ ...EMPTY_ACCOUNT, isDefault: true });
      setBankSearch("");
      setBranchSearch("");
      toast.info("כדי לעבור לחשבון עצמאי יש להגדיר תחילה את חשבון המעסיק.");
    } finally {
      setSwitching(false);
    }
  }

  async function edit() {
    if (!canManage || !account || inherited) return;
    try {
      const full = await alphaApi.employerPaymentAccount(organizationId, employerId, account.id);
      setEditingId(account.id);
      setCreatingOverride(false);
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
      let accountId = editingId;
      if (editingId) {
        await alphaApi.updateEmployerPaymentAccount(organizationId, employerId, editingId, { ...form, isDefault: true });
      } else {
        const created = await alphaApi.createEmployerPaymentAccount(organizationId, employerId, { ...form, isDefault: true });
        accountId = created.id;
      }
      if (accountId) {
        await alphaApi.updateEmployerPaymentMandate(organizationId, employerId, accountId, {
          status: mandateStatus,
          externalMandateId,
          documentId,
        });
      }
      if (creatingOverride) {
        const result = await alphaApi.updateEmployerPensionPaymentMode(organizationId, employerId, 1);
        onModeSaved({ ...pensionPayment, mode: result.mode, modeOverridden: result.modeOverridden });
      }
      clearEditor();
      await reload();
      toast.success(editingId ? "חשבון התשלום עודכן" : "חשבון התשלום העצמאי נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת חשבון התשלום נכשלה");
    } finally {
      setSaving(false);
    }
  }

  const showEditor = canManage && (editingId !== null || creatingOverride || (!account && pensionPayment.mode === 1));

  return <div className="employer-profile-stack single-payment-layout">
    <section className="card profile-payment-card">
      <div className="card-head">
        <div>
          <h2>חשבון לתשלומים פנסיוניים</h2>
          <span style={{ color: "var(--muted)" }}>למעסיק יש חשבון אפקטיבי אחד: חשבון הארגון או חשבון עצמאי מוחרג.</span>
        </div>
        {account ? <span className={inherited ? "badge badge-blue" : "badge badge-green"}>{inherited ? "חשבון ארגוני" : "חשבון מעסיק"}</span> : null}
      </div>

      {pensionPayment.canChangeMode ? <div className="grid two-cols" style={{ marginBottom: 18 }}>
        <button type="button" disabled={switching} className={`choice-card${pensionPayment.mode === 2 ? " selected" : ""}`} onClick={() => void switchToOrganizationAccount()}>
          <Building2 size={24} /><b>שימוש בחשבון הארגון</b><p>ברירת המחדל. שינויים בחשבון הארגוני יחולו על דיווחים חדשים.</p>
        </button>
        <button type="button" disabled={switching} className={`choice-card${pensionPayment.mode === 1 ? " selected" : ""}`} onClick={() => void switchToEmployerAccount()}>
          <WalletCards size={24} /><b>חשבון עצמאי למעסיק</b><p>החרגה מהארגון ושימוש בחשבון ייעודי למעסיק הזה.</p>
        </button>
      </div> : null}

      {account ? <article className="payment-account-card payment-account-card-single">
        <div className="payment-account-head">
          <div><b>{account.accountHolderName}</b>{inherited ? <span className="badge badge-blue">מנוהל ברמת הארגון</span> : null}</div>
          <span className={account.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(account.mandate?.status)}</span>
        </div>
        <div className="payment-account-details payment-account-details-wide">
          <span><b>בנק וסניף</b><small>בנק {account.bankId} · סניף {account.branchId}</small></span>
          <span><b>מספר חשבון</b><small>{account.maskedAccountNumber}</small></span>
          <span><b>בעל החשבון</b><small>{account.maskedAccountHolderId}</small></span>
          <span><b>מקור</b><small>{inherited ? "חשבון הארגון" : "חשבון עצמאי של המעסיק"}</small></span>
        </div>
        {canManage && !inherited ? <div className="payment-account-actions"><button className="btn btn-secondary" type="button" onClick={() => void edit()}>עריכת החשבון</button></div> : null}
      </article> : <div className="empty">{inherited ? "לא הוגדר עדיין חשבון תשלום פנסיוני ברמת הארגון." : "לא הוגדר עדיין חשבון עצמאי למעסיק."}</div>}

      {inherited && account ? <div className="notice notice-info" style={{ marginTop: 16 }}>החשבון מוצג לקריאה בלבד כאן. עריכת החשבון מתבצעת בפרופיל הארגון.</div> : null}
    </section>

    {showEditor ? <section className="card profile-payment-card">
      <div className="card-head"><div><h2>{editingId ? "עריכת חשבון המעסיק" : "הגדרת חשבון עצמאי למעסיק"}</h2><span style={{ color: "var(--muted)" }}>שמירת חשבון חדש תיצור החרגה מהחשבון הארגוני.</span></div></div>
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
        <div className="form-actions">
          <button className="btn btn-secondary" type="button" onClick={clearEditor}>ביטול</button>
          <button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירה"}</button>
        </div>
      </form>
    </section> : null}
    {!canManage ? <div className="notice notice-info">החשבון מוצג לקריאה בלבד לפי ההרשאה שלך.</div> : null}
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

  return <section className="card profile-card reporting-settings-card">
    <div className="card-head"><div><h2>הגדרות דיווח</h2><span style={{ color: "var(--muted)" }}>ברירות מחדל נוחות לדיווחים חדשים. בכל דיווח ניתן לשנות אותן לפי הצורך.</span></div></div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הגדרות הדיווח מוצגות לקריאה בלבד לפי ההרשאה שלך.</div> : null}
    <form className="form" onSubmit={save}>
      <div className="grid two-cols">
        <div className="field">
          <label>יום תשלום שכר</label>
          <select disabled={!canEdit} value={form.defaultSalaryPaymentDay ?? ""} onChange={(e) => setForm({ ...form, defaultSalaryPaymentDay: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            {Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} בחודש</option>)}
          </select>
        </div>
        <div className="field">
          <label>אמצעי תשלום</label>
          <select disabled={!canEdit} value={form.defaultPaymentMethodCode ?? ""} onChange={(e) => setForm({ ...form, defaultPaymentMethodCode: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>העברה בנקאית</option>
            <option value={3}>כרטיס אשראי</option>
            <option value={4}>שובר תשלום</option>
            <option value={5}>סליקה באמצעות מסלקה פנסיונית</option>
            <option value={6}>הרשאה לחיוב חשבון / הוראת קבע</option>
            <option value={7}>סליקה באמצעות מס״ב</option>
            <option value={9}>הרשאה לחיוב חשבון לפי קובץ דיווח</option>
          </select>
        </div>
        <div className="field">
          <label>סוג חשבון המעסיק</label>
          <select disabled={!canEdit} value={form.defaultEmployerAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultEmployerAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון מעסיק</option>
            <option value={2}>חשבון נאמנות</option>
          </select>
        </div>
        <div className="field">
          <label>סוג חשבון המקבל</label>
          <select disabled={!canEdit} value={form.defaultReceiverAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultReceiverAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון יצרן</option>
            <option value={2}>חשבון נאמנות</option>
          </select>
        </div>
      </div>
      <div className="field"><label>הערות תפעוליות לדיווח</label><textarea disabled={!canEdit} maxLength={500} value={form.reportingNotes} onChange={(e) => setForm({ ...form, reportingNotes: e.target.value })} placeholder="הערות פנימיות שיופיעו כברירת מחדל בתהליך הדיווח" /></div>
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
