"use client";

import { UiInput, UiSelect } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Play, RefreshCw, Settings2, CreditCard, X, Pencil, Save, Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
import { DataTable } from "@/components/data-table";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { BillingAccountPricingType, BillingCustomerRow } from "@/lib/types";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";

type RunSummary = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeactivated: number;
  errorMessage: string | null;
};

type IntegrationRow = {
  key: string;
  name: string;
  lastRun: RunSummary | null;
};

type RunDetail = RunSummary & {
  integrationKey: string;
  integrationName: string;
  details?: Record<string, unknown> | null;
};

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const body = await response.json();
      message = body.errorMessage ?? body.error ?? body.detail ?? body.title ?? message;
    } catch { /* empty body */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function formatDate(value?: string | null) {
  return formatDateTimeDDMMYYYY(value, "—");
}

function statusLabel(status?: string) {
  if (status === "Success") return "הושלם בהצלחה";
  if (status === "Failed") return "נכשל";
  if (status === "Running") return "רץ כעת";
  if (status === "Active") return "פעיל";
  return status ?? "-";
}

const adminTabs = [
  { key: "interfaces", label: "ממשקים", icon: Settings2 },
  { key: "subscriptions", label: "ניהול גבייה ותמחור", icon: CreditCard },
] satisfies Array<{ key: "interfaces" | "subscriptions"; label: string; icon: typeof Settings2 }>;

const entityTypeOptions = [
  { value: "all", label: "כל סוגי הישות" },
  { value: "Organization", label: "ארגונים" },
  { value: "Employer", label: "מעסיקים" },
];

const billingTypeOptions = [
  { value: "all", label: "כל המסלולים" },
  { value: "Free", label: "חינם" },
  { value: "PerEmployee", label: "פר עובד" },
  { value: "PerReportRow", label: "פר שורה" },
];

const paymentMethodOptions = [
  { value: "all", label: "כל אמצעי התשלום" },
  { value: "None", label: "לא מוגדר" },
  { value: "CreditCard", label: "כרטיס אשראי" },
  { value: "BankDebit", label: "חיוב חשבון" },
];

const paymentStatusOptions = [
  { value: "all", label: "כל מצבי אמצעי התשלום" },
  { value: "NotConfigured", label: "לא מוגדר" },
  { value: "Pending", label: "ממתין" },
  { value: "Active", label: "פעיל" },
  { value: "Failed", label: "נכשל" },
  { value: "Suspended", label: "מושהה" },
  { value: "Cancelled", label: "בוטל" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"interfaces" | "subscriptions">("interfaces");
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [billingCustomers, setBillingCustomers] = useState<BillingCustomerRow[]>([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [employerFilter, setEmployerFilter] = useState("all");
  const [billingTypeFilter, setBillingTypeFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [editingBillingCustomer, setEditingBillingCustomer] = useState<BillingCustomerRow | null>(null);
  const [billingTypeDraft, setBillingTypeDraft] = useState<BillingAccountPricingType>("Free");
  const [unitPriceDraft, setUnitPriceDraft] = useState("0");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [error, setError] = useState("");
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [history, setHistory] = useState<RunDetail[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [interfaceRows, customers] = await Promise.all([
        adminRequest<IntegrationRow[]>("/api/platform/reference-data/interfaces"),
        alphaApi.billingCustomers(),
      ]);
      setRows(interfaceRows);
      setBillingCustomers(customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת מסך האדמין נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onScopeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId?: string; employerId?: string }>).detail;
      setOrganizationFilter(detail?.organizationId || "all");
      setEmployerFilter(detail?.employerId || "all");
    };
    window.addEventListener("alpha:scope-change", onScopeChange);

    const session = getSession();
    if (!session?.platformAdmin) {
      router.replace("/dashboard");
      return () => window.removeEventListener("alpha:scope-change", onScopeChange);
    }
    void load();
    return () => window.removeEventListener("alpha:scope-change", onScopeChange);
  }, [router]);

  async function runInterface(key: string) {
    setRunning(key);
    setError("");
    try {
      const result = await adminRequest<RunDetail>(`/api/platform/reference-data/interfaces/${key}/run`, { method: "POST" });
      setSelectedRun(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "הרצת הממשק נכשלה");
    } finally {
      setRunning(null);
    }
  }

  async function openHistory(key: string) {
    setHistoryKey(key);
    setSelectedRun(null);
    try {
      setHistory(await adminRequest<RunDetail[]>(`/api/platform/reference-data/interfaces/${key}/runs?take=30`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת היסטוריית ההרצות נכשלה");
      setHistory([]);
    }
  }

  function billingPlanLabel(type: BillingAccountPricingType) {
    if (type === "PerEmployee") return "פר עובד";
    if (type === "PerReportRow") return "פר שורה";
    return "חינם";
  }

  function paymentMethodStatusKey(row: BillingCustomerRow) {
    const value = String(row.paymentMethodStatus);
    if (value === "1" || value === "NotConfigured") return "NotConfigured";
    if (value === "2" || value === "Pending") return "Pending";
    if (value === "3" || value === "Active") return "Active";
    if (value === "4" || value === "Failed") return "Failed";
    if (value === "5" || value === "Suspended") return "Suspended";
    if (value === "6" || value === "Cancelled") return "Cancelled";
    return value;
  }

  function paymentMethodStatusLabel(row: BillingCustomerRow) {
    return ({
      NotConfigured: "לא מוגדר",
      Pending: "ממתין",
      Active: "פעיל",
      Failed: "נכשל",
      Suspended: "מושהה",
      Cancelled: "בוטל",
    } as Record<string, string>)[paymentMethodStatusKey(row)] ?? String(row.paymentMethodStatus);
  }

  function paymentMethodKey(row: BillingCustomerRow) {
    if (paymentMethodStatusKey(row) === "NotConfigured") return "None";
    const value = String(row.paymentMethodType);
    return value === "2" || value === "BankDebit" ? "BankDebit" : "CreditCard";
  }

  function paymentMethodLabel(row: BillingCustomerRow) {
    const method = paymentMethodKey(row);
    if (method === "None") return "לא מוגדר";
    if (method === "BankDebit") return "חיוב חשבון";
    return row.cardLast4 ? `${row.cardBrand || "כרטיס"} •••• ${row.cardLast4}` : "כרטיס אשראי";
  }

  function paymentDetailsHref(row: BillingCustomerRow) {
    if (row.billingSource === "Organization") return `/organizations/${row.organizationId}`;
    return row.employerId ? `/employers/${row.employerId}` : `/organizations/${row.organizationId}`;
  }

  function openBillingEdit(row: BillingCustomerRow) {
    setEditingBillingCustomer(row);
    setBillingTypeDraft(row.billingType);
    setUnitPriceDraft(String(row.unitPrice ?? 0));
    setError("");
  }

  async function saveBillingEdit() {
    if (!editingBillingCustomer) return;
    const unitPrice = billingTypeDraft === "Free" ? 0 : Number(unitPriceDraft);
    if (billingTypeDraft !== "Free" && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
      setError("יש להזין תעריף גדול מאפס.");
      return;
    }

    setSavingPricing(true);
    setError("");
    try {
      await alphaApi.updateBillingCustomerPricing({
        payerType: editingBillingCustomer.payerType,
        payerId: editingBillingCustomer.payerId,
        billingType: billingTypeDraft,
        unitPrice,
      });
      setBillingCustomers(await alphaApi.billingCustomers());
      setEditingBillingCustomer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת המסלול והתעריף נכשלה");
    } finally {
      setSavingPricing(false);
    }
  }

  const organizationOptions = Array.from(
    new Map(billingCustomers.map((row) => [row.organizationId, row.organizationName])).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], "he"));

  const employerOptions = Array.from(
    new Map(
      billingCustomers
        .filter((row) => row.employerId && row.employerName && (organizationFilter === "all" || row.organizationId === organizationFilter))
        .map((row) => [row.employerId!, row.employerName!]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], "he"));

  const filteredBillingCustomers = billingCustomers.filter((row) => {
    if (entityTypeFilter !== "all" && row.entityType !== entityTypeFilter) return false;
    if (organizationFilter !== "all" && row.organizationId !== organizationFilter) return false;
    if (employerFilter !== "all" && row.employerId !== employerFilter) return false;
    if (billingTypeFilter !== "all" && row.billingType !== billingTypeFilter) return false;
    if (paymentMethodFilter !== "all" && paymentMethodKey(row) !== paymentMethodFilter) return false;
    if (paymentStatusFilter !== "all" && paymentMethodStatusKey(row) !== paymentStatusFilter) return false;
    return true;
  });

  return <AppShell title="מסך אדמין" hideScopeController={tab !== "subscriptions"}>
    <div className="page-head">
      <div><h1>מסך אדמין</h1><p>ניהול ממשקי המערכת וניהול הגבייה והתמחור</p></div>
      <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={loading || Boolean(running)}><RefreshCw size={16} />רענון</button>
    </div>

    <AppTabs items={adminTabs} activeKey={tab} onChange={setTab} ariaLabel="מסך אדמין" />

    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}

    {tab === "interfaces" ? <section className="card admin-section-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border, #dce3ea)" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>ממשקי סנכרון</h2>
        <p style={{ margin: "5px 0 0", color: "var(--muted)" }}>הנתונים נשמרים מקומית ב־DB. ההרצה אינה תלויה במשתמש או בדיווח.</p>
      </div>
      <DataTable
        items={rows}
        loading={loading}
        loadingLabel="טוען ממשקים..."
        emptyState="לא נמצאו ממשקים."
        rowKey={(row) => row.key}
        tableClassName="admin-interfaces-table"
        columns={["ממשק","הרצה אחרונה","סטטוס","נקלטו","חדשות","עודכנו","הושבתו","פעולות"].map((label, index) => ({ key: String(index), label }))}
        renderCells={(row) => [
          <span key="name"><b>{row.name}</b><span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{row.key}</span></span>,
          formatDate(row.lastRun?.finishedAt ?? row.lastRun?.startedAt),
          statusLabel(row.lastRun?.status),
          row.lastRun?.recordsReceived ?? "-",
          row.lastRun?.recordsInserted ?? "-",
          row.lastRun?.recordsUpdated ?? "-",
          row.lastRun?.recordsDeactivated ?? "-",
          <div key="actions" className="admin-actions">
            <button className="btn btn-primary" type="button" disabled={Boolean(running)} onClick={() => void runInterface(row.key)}><Play size={15} />{running === row.key ? "מריץ..." : "הרץ עכשיו"}</button>
            <button className="btn btn-secondary" type="button" onClick={() => void openHistory(row.key)}><Eye size={15} />דוחות הרצה</button>
          </div>,
        ]}
      />
    </section> : <section className="card admin-section-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border, #dce3ea)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>מנויים</h2>
          <p style={{ margin: "5px 0 0", color: "var(--muted)" }}>כל ארגון וכל מעסיק, המסלול שלו והתעריף שלו.</p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <label className="field" style={{ minWidth: 180 }}>
            <span>סוג ישות</span>
            <UiSelect value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value)}>
              {entityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
          <label className="field" style={{ minWidth: 180 }}>
            <span>סוג מסלול</span>
            <UiSelect value={billingTypeFilter} onChange={(event) => setBillingTypeFilter(event.target.value)}>
              {billingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
          <label className="field" style={{ minWidth: 190 }}>
            <span>אמצעי תשלום</span>
            <UiSelect value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value)}>
              {paymentMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
          <label className="field" style={{ minWidth: 210 }}>
            <span>מצב אמצעי תשלום</span>
            <UiSelect value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)}>
              {paymentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
        </div>
      </div>
      <DataTable
        items={filteredBillingCustomers}
        loading={loading}
        loadingLabel="טוען מנויים..."
        emptyState="לא נמצאו מנויים בהתאם לסינון."
        rowKey={(item) => `${item.payerType}:${item.payerId}`}
        tableClassName="admin-subscriptions-table"
        columns={[
          { key: "entity", label: "סוג ישות" },
          { key: "organization", label: "ארגון" },
          { key: "employer", label: "מעסיק" },
          { key: "plan", label: "מסלול" },
          { key: "price", label: "תעריף" },
          { key: "payment", label: "אמצעי תשלום" },
          { key: "actions", label: "פעולות" },
        ]}
        renderCells={(item) => {
          return [
            <b key="entity">{item.entityType === "Organization" ? "ארגון" : "מעסיק"}</b>,
            <Link key="organization" className="profile-link" href={`/organizations/${item.organizationId}`}><b>{item.organizationName}</b></Link>,
            item.entityType === "Employer" ? <Link key="employer" className="profile-link" href={`/employers/${item.employerId}`}><b>{item.employerName || item.payerName}</b></Link> : "—",
            <span key="plan" className="admin-plan-cell"><b>{billingPlanLabel(item.billingType)}</b>{item.inherited ? <span className="tooltip admin-inheritance-tooltip" tabIndex={0} aria-label={`יורש מהארגון · ${item.billedThroughName}`}><Info size={15} aria-hidden="true" /><span className="tooltip-bubble" role="tooltip">יורש מהארגון · {item.billedThroughName}</span></span> : null}</span>,
            item.billingType === "Free" ? "—" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(item.unitPrice),
            <span key="payment"><span>{paymentMethodLabel(item)}</span>{item.inherited ? <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 3 }}>דרך הארגון</span> : null}</span>,
            <div key="actions" className="admin-actions">
              <button className="btn btn-secondary" type="button" onClick={() => openBillingEdit(item)}><Pencil size={15} />מסלול ותעריף</button>
              <Link className="btn btn-secondary" href={paymentDetailsHref(item)}><Pencil size={15} />אמצעי תשלום</Link>
            </div>,
          ];
        }}
      />
    </section>}

    {editingBillingCustomer ? <div style={backdropStyle} onClick={() => setEditingBillingCustomer(null)}>
      <div style={{ ...modalStyle, maxWidth: 520, minHeight: 400, display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>עריכת מסלול ותעריף</h2>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{editingBillingCustomer.payerName}</div>
            {editingBillingCustomer.inherited ? <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>כרגע יורש את המסלול מהארגון. שמירה כאן תגדיר למעסיק מסלול ותעריף עצמאיים.</div> : null}
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => setEditingBillingCustomer(null)}><X size={17} /></button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <label className="field">
            <span>מסלול</span>
            <UiSelect value={billingTypeDraft} onChange={(event) => setBillingTypeDraft(event.target.value as BillingAccountPricingType)}>
              {[
                { value: "Free", label: "חינם" },
                { value: "PerEmployee", label: "פר עובד" },
                { value: "PerReportRow", label: "פר שורה" },
              ].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
          {billingTypeDraft !== "Free" ? <label className="field">
            <span>{billingTypeDraft === "PerEmployee" ? "תעריף לעובד" : "תעריף לשורה"}</span>
            <UiInput type="number" min={0.01} step="0.01" value={unitPriceDraft} onChange={(event) => setUnitPriceDraft(event.target.value)} />
          </label> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "auto", paddingTop: 24 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setEditingBillingCustomer(null)}>ביטול</button>
          <button className="btn btn-primary" type="button" disabled={savingPricing} onClick={() => void saveBillingEdit()}><Save size={15} />{savingPricing ? "שומר..." : "שמירה"}</button>
        </div>
      </div>
    </div> : null}

    {historyKey ? <div style={backdropStyle} onClick={() => setHistoryKey(null)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}><div><h2 style={{ margin: 0 }}>דוחות הרצה</h2><div style={{ color: "var(--muted)", marginTop: 4 }}>{rows.find((x) => x.key === historyKey)?.name}</div></div><button className="btn btn-secondary" onClick={() => setHistoryKey(null)}><X size={17} /></button></div>
        <DataTable
          items={history}
          rowKey={(run) => run.id}
          tableClassName="admin-run-history-table"
          maxHeight={520}
          emptyState="אין עדיין הרצות"
          columns={["תאריך","סטטוס","נקלטו","חדשות","עודכנו","הושבתו","דוח"].map((label, index) => ({ key: String(index), label }))}
          renderCells={(run) => [
            formatDate(run.startedAt),
            statusLabel(run.status),
            run.recordsReceived,
            run.recordsInserted,
            run.recordsUpdated,
            run.recordsDeactivated,
            <button key="open" className="btn btn-secondary" style={{ paddingInline: 12 }} onClick={() => setSelectedRun(run)}>פתח</button>,
          ]}
        />
      </div>
    </div> : null}

    {selectedRun ? <div style={backdropStyle} onClick={() => setSelectedRun(null)}>
      <div style={{ ...modalStyle, maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}><div><h2 style={{ margin: 0 }}>דוח הרצה</h2><div style={{ color: "var(--muted)", marginTop: 4 }}>{selectedRun.integrationName}</div></div><button className="btn btn-secondary" onClick={() => setSelectedRun(null)}><X size={17} /></button></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[["סטטוס",statusLabel(selectedRun.status)],["התחלה",formatDate(selectedRun.startedAt)],["סיום",formatDate(selectedRun.finishedAt)],["נקלטו",selectedRun.recordsReceived],["חדשות",selectedRun.recordsInserted],["עודכנו",selectedRun.recordsUpdated],["הושבתו",selectedRun.recordsDeactivated]].map(([label,value]) => <div key={String(label)} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}><div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div><b>{value}</b></div>)}
        </div>
        {selectedRun.errorMessage ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{selectedRun.errorMessage}</div> : null}
        <h3 style={{ marginBottom: 8 }}>פרטי מקור</h3>
        <pre style={{ direction: "ltr", textAlign: "left", background: "var(--bg)", padding: 12, borderRadius: 10, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedRun.details ?? {}, null, 2)}</pre>
      </div>
    </div> : null}
  </AppShell>;
}

const backdropStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalStyle: React.CSSProperties = { width: "min(950px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "var(--surface)", borderRadius: 16, padding: 20, boxShadow: "0 24px 70px rgba(15,23,42,.25)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 };
