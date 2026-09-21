"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, CreditCard, FileSliders, Save, Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
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
  PensionPaymentResolution,
} from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";
import { UiChoiceCard, UiInput, UiSelect, UiTextarea } from "@/components/ui-controls";
import { Tooltip } from "@/components/tooltip";

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

    <AppTabs items={tabs} activeKey={tab} onChange={setTab} ariaLabel="פרופיל מעסיק" />

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

  return <section className="card profile-card employer-general-card employer-general-card-compact">
    <div className="card-head">
      <div><h2>פרטים כלליים</h2><span style={{ color: "var(--muted)" }}>פרטי המעסיק, איש הקשר והכתובת במקום אחד.</span></div>
      <span className={employer.status === 2 ? "badge badge-green" : "badge badge-gray"}>{employer.status === 2 ? "פעיל" : "בתהליך הקמה"}</span>
    </div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד לפי ההרשאה שלך.</div> : null}

    <form className="form" onSubmit={saveAll}>
      <div className="profile-form-section">
        <h3>פרטי מעסיק</h3>
        <div className="grid employer-details-grid">
          <div className="field field-span-2"><label>שם משפטי מלא *</label><UiInput disabled={!canEdit} required maxLength={200} value={details.legalName} onChange={(e) => setDetails({ ...details, legalName: e.target.value })} /></div>
          <div className="field"><label>מספר חברה / עוסק *</label><UiInput disabled={!canEdit} required inputMode="numeric" maxLength={15} value={details.registrationNumber} onChange={(e) => setDetails({ ...details, registrationNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label className="field-label-with-info"><span>תיק ניכויים *</span><Tooltip content="אם אין תיק ניכויים, יש להזין 900000000." /></label><UiInput disabled={!canEdit} required inputMode="numeric" maxLength={9} value={details.withholdingFileNumber} onChange={(e) => setDetails({ ...details, withholdingFileNumber: e.target.value.replace(/\D/g, "") })} /></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>איש קשר</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>שם פרטי *</label><UiInput disabled={!canEdit} maxLength={20} value={details.contactFirstName ?? ""} onChange={(e) => setDetails({ ...details, contactFirstName: e.target.value })} /></div>
          <div className="field"><label>שם משפחה *</label><UiInput disabled={!canEdit} maxLength={20} value={details.contactLastName ?? ""} onChange={(e) => setDetails({ ...details, contactLastName: e.target.value })} /></div>
          <div className="field"><label>טלפון</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={11} value={details.contactPhone ?? ""} onChange={(e) => setDetails({ ...details, contactPhone: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>נייד</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={15} value={details.contactMobile ?? ""} onChange={(e) => setDetails({ ...details, contactMobile: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field field-span-2"><label>אימייל *</label><UiInput disabled={!canEdit} required type="email" maxLength={50} value={details.contactEmail ?? ""} onChange={(e) => setDetails({ ...details, contactEmail: e.target.value })} /></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>כתובת</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>יישוב</label><UiInput disabled={!canEdit} maxLength={100} value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
          <div className="field"><label>רחוב</label><UiInput disabled={!canEdit} maxLength={100} value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} /></div>
          <div className="field"><label>מספר בית</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.houseNumber} onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })} /></div>
          <div className="field"><label>דירה</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.apartment} onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })} /></div>
          <div className="field"><label>מיקוד</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={10} value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>תא דואר</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.postOfficeBox} onChange={(e) => setAddressForm({ ...addressForm, postOfficeBox: e.target.value })} /></div>
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
  const [resolution, setResolution] = useState<PensionPaymentResolution | null>(null);
  const [selectedMode, setSelectedMode] = useState<1 | 2 | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployerPaymentAccountInput>({ ...EMPTY_ACCOUNT, isDefault: true });
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [branches, setBranches] = useState<BankBranchOption[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [mandateStatus, setMandateStatus] = useState<BankDebitMandateStatus>(1);
  const [externalMandateId, setExternalMandateId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingChoice, setLoadingChoice] = useState(true);

  async function loadResolution() {
    setLoadingChoice(true);
    try {
      const value = await alphaApi.employerPaymentResolution(organizationId, employerId);
      setResolution(value);
      setSelectedMode(pensionPayment.modeOverridden ? pensionPayment.mode : null);
      setAccounts(value.account ? [value.account] : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת חשבון התשלום נכשלה");
    } finally {
      setLoadingChoice(false);
    }
  }

  useEffect(() => { void loadResolution(); }, [organizationId, employerId]);

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

  async function selectEmployerMode() {
    setSelectedMode(1);
    const direct = resolution?.employerAccount;
    if (!direct) {
      setEditingId(null);
      setForm({ ...EMPTY_ACCOUNT, isDefault: true });
      setBankSearch("");
      setBranchSearch("");
      setMandateStatus(1);
      setExternalMandateId("");
      setDocumentId("");
      return;
    }
    try {
      const full = await alphaApi.employerPaymentAccount(organizationId, employerId, direct.id);
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

  function selectOrganizationMode() {
    if (!resolution?.organizationAccount) return;
    setSelectedMode(2);
  }

  async function saveOrganizationMode() {
    if (!canManage || !resolution?.organizationAccount) return;
    setSaving(true);
    try {
      const result = await alphaApi.updateEmployerPensionPaymentMode(organizationId, employerId, 2);
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
      const result = await alphaApi.updateEmployerPensionPaymentMode(organizationId, employerId, 1);
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
        <UiChoiceCard
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
        </UiChoiceCard>

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
            <span><b>מספר חשבון</b><small>{organizationAccount.maskedAccountNumber}</small></span>
            <span><b>בעל החשבון</b><small>{organizationAccount.accountHolderName}</small></span>
            <span><b>מזהה בעל החשבון</b><small>{organizationAccount.maskedAccountHolderId}</small></span>
          </div>
          {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={saving} onClick={() => void saveOrganizationMode()}><Save size={17} />{saving ? "שומר..." : "שמירת בחירה"}</button></div> : null}
        </> : null}

        {selectedMode === 1 ? <form className="form compact-payment-form" onSubmit={saveEmployerMode}>
          <div className="account-context-head">
            <div><span>מקור החשבון</span><strong>המעסיק</strong></div>
            {directAccount ? <span className={directAccount.mandateIsActive ? "badge badge-green" : "badge badge-gray"}>{mandateLabel(directAccount.mandate?.status)}</span> : <span className="badge badge-gray">טרם נשמר</span>}
          </div>
          <div className="grid compact-payment-grid">
            <div className="field">
              <label>בנק *</label>
              <UiInput list="employer-payment-banks" placeholder="שם או מספר בנק" value={bankSearch} onChange={(e) => {
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
              <UiInput list="employer-payment-branches" disabled={!form.bankId} placeholder="סניף או עיר" value={branchSearch} onChange={(e) => {
                const value = e.target.value;
                setBranchSearch(value);
                const code = Number(value.split(" - ")[0]);
                setForm((current) => ({ ...current, branchId: Number.isFinite(code) ? code : 0 }));
              }} />
              <datalist id="employer-payment-branches">{branches.map((branch) => <option key={branch.branchCode} value={`${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`} />)}</datalist>
            </div>
            <div className="field"><label>מספר חשבון *</label><UiInput required inputMode="numeric" maxLength={30} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>שם בעל החשבון *</label><UiInput required maxLength={150} value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} /></div>
            <div className="field"><label>ת״ז / ח.פ. *</label><UiInput required inputMode="numeric" maxLength={20} value={form.accountHolderId} onChange={(e) => setForm({ ...form, accountHolderId: e.target.value.replace(/\D/g, "") })} /></div>
            <div className="field"><label>סטטוס הרשאה</label><UiSelect value={mandateStatus} onChange={(e) => setMandateStatus(Number(e.target.value) as BankDebitMandateStatus)}><option value={1}>ממתינה</option><option value={2}>פעילה</option><option value={3}>נדחתה</option><option value={4}>בוטלה</option><option value={5}>פגה</option></UiSelect></div>
            <div className="field"><label>מזהה הרשאה</label><UiInput maxLength={120} value={externalMandateId} onChange={(e) => setExternalMandateId(e.target.value)} /></div>
            <div className="field"><label>מסמך הרשאה</label><UiInput maxLength={200} value={documentId} onChange={(e) => setDocumentId(e.target.value)} /></div>
          </div>
          {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : directAccount ? "שמירת שינויים" : "שמירת חשבון"}</button></div> : null}
        </form> : null}

        {!canManage && activeAccount ? <div className="notice notice-info">החשבון מוצג לקריאה בלבד לפי ההרשאה שלך.</div> : null}
      </div>
    </div>
  </section>;
}

function EmployerBillingInheritanceTab({ organizationId, employer, canManageEmployer, billing, onModeSaved }: {
  organizationId: string;
  employer: Employer;
  canManageEmployer: boolean;
  billing: EmployerProfileCenterSettings["billing"];
  onModeSaved: (value: EmployerProfileCenterSettings["billing"]) => void;
}) {
  const [resolution, setResolution] = useState<EmployerBillingResolution | null>(null);
  const [selectedMode, setSelectedMode] = useState<1 | 2 | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadResolution() {
    setLoading(true);
    try {
      const value = await alphaApi.employerBillingResolution(organizationId, employer.id);
      setResolution(value);
      setSelectedMode(billing.modeOverridden ? billing.mode : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הגדרת החיוב נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadResolution(); }, [organizationId, employer.id]);

  async function persistMode(nextMode: 1 | 2) {
    if (!billing.canChangeMode) return;
    setSavingMode(true);
    try {
      const result = await alphaApi.updateEmployerBilling(organizationId, employer.id, nextMode);
      const nextBilling = { ...billing, mode: result.billingMode, modeOverridden: true };
      onModeSaved(nextBilling);
      setSelectedMode(result.billingMode);
      await loadResolution();
      toast.success("אופן החיוב של המעסיק נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת אופן החיוב נכשלה");
    } finally {
      setSavingMode(false);
    }
  }

  if (loading || !resolution) return <div className="empty">טוען הגדרות חיוב...</div>;

  const organizationAvailable = resolution.organizationAccount.configured;

  return <section className="card profile-payment-card payment-horizontal-shell">
    <div className="card-head">
      <div><h2>חיוב ALPHA</h2><span style={{ color: "var(--muted)" }}>בחרו אם החיוב של המעסיק מתבצע דרך הארגון או באמצעות פרטי חיוב עצמאיים.</span></div>
      {billing.modeOverridden && resolution.effectiveAccount.configured ? <span className={resolution.source === "Organization" ? "badge badge-blue" : "badge badge-green"}>{resolution.source === "Organization" ? "פעיל: חיוב ארגוני" : "פעיל: חיוב מעסיק"}</span> : null}
    </div>

    <div className="payment-horizontal-layout">
      <aside className="payment-source-column">
        <UiChoiceCard
          compact
          disabled={!billing.canChangeMode || !organizationAvailable}
          selected={selectedMode === 2}
          onClick={() => setSelectedMode(2)}
          tooltip={organizationAvailable ? "קיימים פרטי חיוב ארגוניים זמינים למעסיק הזה" : "לא קיימים פרטי חיוב ארגוניים זמינים"}
        >
          <Building2 size={22} />
          <b>חיוב דרך הארגון</b>
          <p>{organizationAvailable ? "שימוש בפרטי החיוב המרכזיים של הארגון." : "לא הוגדרו עדיין פרטי חיוב בארגון."}</p>
          {organizationAvailable ? <Tooltip content="קיימים פרטי חיוב ארגוניים זמינים למעסיק הזה"><span className="option-hint">ⓘ קיים חיוב ארגוני</span></Tooltip> : null}
        </UiChoiceCard>

        <UiChoiceCard
          compact
          disabled={!billing.canChangeMode}
          selected={selectedMode === 1}
          onClick={() => setSelectedMode(1)}
        >
          <CreditCard size={22} />
          <b>חיוב עצמאי למעסיק</b>
          <p>פרטי חיוב ואמצעי תשלום נפרדים למעסיק הזה.</p>
        </UiChoiceCard>

        {!billing.canChangeMode ? <small className="permission-hint">אין לך הרשאה לשנות את אופן החיוב.</small> : null}
      </aside>

      <div className="payment-details-column">
        {selectedMode === null ? <div className="payment-placeholder">
          <CreditCard size={30} />
          <b>בחרו מקור לחיוב</b>
          <span>לא נשמר שינוי עד להשלמת הפרטים ולחיצה על שמירה.</span>
        </div> : null}

        {selectedMode === 2 && organizationAvailable ? <>
          <div className="account-context-head">
            <div><span>מקור החיוב</span><strong>הארגון</strong><small>{resolution.billedThroughName}</small></div>
            <span className={resolution.organizationAccount.paymentMethodStatus === 3 ? "badge badge-green" : "badge badge-gray"}>{billingPaymentStatusLabel(resolution.organizationAccount.paymentMethodStatus)}</span>
          </div>
          <div className="grid compact-billing-summary">
            <span><b>שם לחיוב</b><small>{resolution.organizationAccount.billingName || "—"}</small></span>
            <span><b>ח.פ. / עוסק</b><small>{resolution.organizationAccount.taxId || "—"}</small></span>
            <span><b>אימייל לחשבוניות</b><small>{resolution.organizationAccount.invoiceEmail || "—"}</small></span>
            <span><b>אמצעי תשלום</b><small>{resolution.organizationAccount.paymentMethodType === 1 ? "כרטיס אשראי" : "הרשאה לחיוב חשבון"}</small></span>
          </div>
          {billing.canChangeMode ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={savingMode} onClick={() => void persistMode(2)}><Save size={17} />{savingMode ? "שומר..." : "שמירת בחירה"}</button></div> : null}
        </> : null}

        {selectedMode === 1 ? <AlphaBillingAccountForm
          organizationId={organizationId}
          employerId={employer.id}
          canManage={canManageEmployer}
          embedded
          showOwnerContext={false}
          onSaved={async () => { await persistMode(1); }}
        /> : null}
      </div>
    </div>
  </section>;
}

function billingPaymentStatusLabel(status: number) {
  if (status === 2) return "ממתין";
  if (status === 3) return "פעיל";
  if (status === 4) return "נכשל";
  if (status === 5) return "מושהה";
  if (status === 6) return "בוטל";
  return "לא הוגדר";
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
  const [dayMenuOpen, setDayMenuOpen] = useState(false);
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
        <div className="field compact-day-field">
          <label>יום תשלום שכר</label>
          <div className="compact-day-picker">
            <button className="compact-day-trigger" type="button" disabled={!canEdit} onClick={() => setDayMenuOpen((open) => !open)}>
              {form.defaultSalaryPaymentDay ? `${form.defaultSalaryPaymentDay} בחודש` : "לא הוגדר"}
            </button>
            {dayMenuOpen && canEdit ? <div className="compact-day-menu">
              <button type="button" onClick={() => { setForm({ ...form, defaultSalaryPaymentDay: null }); setDayMenuOpen(false); }}>לא הוגדר</button>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <button key={day} type="button" className={form.defaultSalaryPaymentDay === day ? "selected" : ""} onClick={() => { setForm({ ...form, defaultSalaryPaymentDay: day }); setDayMenuOpen(false); }}>{day} בחודש</button>)}
            </div> : null}
          </div>
        </div>
        <div className="field">
          <label>אמצעי תשלום</label>
          <UiSelect disabled={!canEdit} value={form.defaultPaymentMethodCode ?? ""} onChange={(e) => setForm({ ...form, defaultPaymentMethodCode: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>העברה בנקאית</option>
            <option value={3}>כרטיס אשראי</option>
            <option value={4}>שובר תשלום</option>
            <option value={5}>סליקה באמצעות מסלקה פנסיונית</option>
            <option value={6}>הרשאה לחיוב חשבון / הוראת קבע</option>
            <option value={7}>סליקה באמצעות מס״ב</option>
            <option value={9}>הרשאה לחיוב חשבון לפי קובץ דיווח</option>
          </UiSelect>
        </div>
        <div className="field">
          <label>סוג חשבון המעסיק</label>
          <UiSelect disabled={!canEdit} value={form.defaultEmployerAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultEmployerAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון מעסיק</option>
            <option value={2}>חשבון נאמנות</option>
          </UiSelect>
        </div>
        <div className="field">
          <label>סוג חשבון המקבל</label>
          <UiSelect disabled={!canEdit} value={form.defaultReceiverAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultReceiverAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון יצרן</option>
            <option value={2}>חשבון נאמנות</option>
          </UiSelect>
        </div>
      </div>
      <div className="field"><label>הערות תפעוליות לדיווח</label><UiTextarea disabled={!canEdit} maxLength={500} value={form.reportingNotes} onChange={(e) => setForm({ ...form, reportingNotes: e.target.value })} placeholder="הערות פנימיות שיופיעו כברירת מחדל בתהליך הדיווח" /></div>
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
