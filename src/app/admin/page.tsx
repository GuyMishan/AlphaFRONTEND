"use client";

import { UiInput, UiSelect } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Play, Settings2, CreditCard, Pencil, Info } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppModal } from "@/components/app-modal";
import { ReferentsAdminTab } from "@/components/referents-admin-tab";
import { AppTabs } from "@/components/app-tabs";
import { DataTable, DataTableLink } from "@/components/data-table";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { backendFetch } from "@/lib/backend-fetch";
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
  const response = await backendFetch(path, { ...init, headers, cache: "no-store" });
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
  { key: "referents", label: "ניהול רפרנטים", icon: Settings2 },
] satisfies Array<{ key: "interfaces" | "subscriptions" | "referents"; label: string; icon: typeof Settings2 }>;

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
  const [tab, setTab] = useState<"interfaces" | "subscriptions" | "referents">("interfaces");
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [billingCustomers, setBillingCustomers] = useState<BillingCustomerRow[]>([]);
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [employerFilter, setEmployerFilter] = useState("all");
  const [billingTypeFilter, setBillingTypeFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
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
    // Opening a referent from Users & Permissions preserves a single
    // authoritative creation flow with assignment validation.
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "referents") setTab("referents");
  }, []);

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

  function customerPaymentHref(row: BillingCustomerRow, tab: "billing" | "pension-payment") {
    // Use the row's actual entity rather than its inherited billing source:
    // admins should land in that organization's/employer's own card.
    if (row.entityType === "Employer" && row.employerId) {
      const params = new URLSearchParams({ organizationId: row.organizationId, tab });
      return `/employers/${row.employerId}?${params.toString()}`;
    }
    return `/organizations/${row.organizationId}?tab=${tab}`;
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
  }).sort((a, b) => {
    const entityOrder = a.entityType === b.entityType ? 0 : a.entityType === "Organization" ? -1 : 1;
    if (entityOrder !== 0) return entityOrder;
    const organizationOrder = a.organizationName.localeCompare(b.organizationName, "he");
    if (organizationOrder !== 0) return organizationOrder;
    return (a.employerName ?? a.payerName).localeCompare(b.employerName ?? b.payerName, "he");
  });

  return <AppShell title="מסך אדמין" hideScopeController={tab !== "subscriptions"}>
    <div className="page-head">
      <div><h1>מסך אדמין</h1><p>ניהול ממשקי המערכת וניהול הגבייה והתמחור</p></div>
    </div>

    <AppTabs items={adminTabs} activeKey={tab} onChange={setTab} ariaLabel="מסך אדמין" />

    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}

    {tab === "referents" ? <ReferentsAdminTab autoCreate={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("create") === "1"} /> : tab === "interfaces" ? <section className="card admin-section-card" style={{ overflow: "hidden" }}>
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
          { key: "alphaPayment", label: "אמצעי תשלום ALPHA" },
          { key: "plan", label: "מסלול" },
          { key: "price", label: "תעריף" },
          { key: "pensionPayment", label: "אמצעי תשלום פנסיוני" },
          { key: "actions", label: "פעולות" },
        ]}
        renderCells={(item) => {
          return [
            <b key="entity">{item.entityType === "Organization" ? "ארגון" : "מעסיק"}</b>,
            <DataTableLink key="organization" className="profile-link" href={`/organizations/${item.organizationId}`}><b>{item.organizationName}</b></DataTableLink>,
            item.entityType === "Employer" ? <DataTableLink key="employer" className="profile-link" href={`/employers/${item.employerId}`}><b>{item.employerName || item.payerName}</b></DataTableLink> : "—",
            <span key="alphaPayment" className="admin-payment-status-cell">
              <span>{item.configured ? "מוגדר" : "לא מוגדר"}</span>
              {item.configured && item.inherited && item.entityType === "Employer" ? <span className="tooltip admin-inheritance-tooltip" tabIndex={0} aria-label={`דרך הארגון · ${item.billedThroughName}`}><Info size={15} aria-hidden="true" /><span className="tooltip-bubble" role="tooltip">דרך הארגון · {item.billedThroughName}</span></span> : null}
            </span>,
            <span key="plan" className="admin-plan-cell"><b>{billingPlanLabel(item.billingType)}</b>{item.inherited ? <span className="tooltip admin-inheritance-tooltip" tabIndex={0} aria-label={`יורש מהארגון · ${item.billedThroughName}`}><Info size={15} aria-hidden="true" /><span className="tooltip-bubble" role="tooltip">יורש מהארגון · {item.billedThroughName}</span></span> : null}</span>,
            item.billingType === "Free" ? "—" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(item.unitPrice),
            <span key="pensionPayment" className="admin-payment-status-cell">
              <span>{item.pensionPaymentConfigured ? "מוגדר" : "לא מוגדר"}</span>
              {item.pensionPaymentConfigured && item.pensionPaymentSource === "Organization" && item.entityType === "Employer" ? <span className="tooltip admin-inheritance-tooltip" tabIndex={0} aria-label={`דרך הארגון · ${item.pensionPaymentThroughName}`}><Info size={15} aria-hidden="true" /><span className="tooltip-bubble" role="tooltip">דרך הארגון · {item.pensionPaymentThroughName}</span></span> : null}
            </span>,
            <div key="actions" className="admin-actions">
              <DataTableLink className="btn btn-secondary" href={customerPaymentHref(item, "billing")}><Pencil size={15} />אמצעי תשלום ALPHA</DataTableLink>
              <DataTableLink className="btn btn-secondary" href={customerPaymentHref(item, "pension-payment")}><Pencil size={15} />אמצעי תשלום פנסיוני</DataTableLink>
            </div>,
          ];
        }}
      />
    </section>}

    {historyKey ? <AppModal title="דוחות הרצה" subtitle={rows.find(x => x.key === historyKey)?.name}
      onClose={() => setHistoryKey(null)} width="xl">
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
    </AppModal> : null}

    {selectedRun ? <AppModal title="דוח הרצה" subtitle={selectedRun.integrationName}
      onClose={() => setSelectedRun(null)} width="lg">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[["סטטוס",statusLabel(selectedRun.status)],["התחלה",formatDate(selectedRun.startedAt)],["סיום",formatDate(selectedRun.finishedAt)],["נקלטו",selectedRun.recordsReceived],["חדשות",selectedRun.recordsInserted],["עודכנו",selectedRun.recordsUpdated],["הושבתו",selectedRun.recordsDeactivated]].map(([label,value]) => <div key={String(label)} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}><div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div><b>{value}</b></div>)}
        </div>
        {selectedRun.errorMessage ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{selectedRun.errorMessage}</div> : null}
        <h3 style={{ marginBottom: 8 }}>פרטי מקור</h3>
        <pre style={{ direction: "ltr", textAlign: "left", background: "var(--bg)", padding: 12, borderRadius: 10, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedRun.details ?? {}, null, 2)}</pre>
    </AppModal> : null}
  </AppShell>;
}
