"use client";

import { UiInput, UiSelect } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Play, RefreshCw, Settings2, CreditCard, X, Pencil, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { BillingAccountPricingType, BillingCustomerRow } from "@/lib/types";

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
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
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
  if (!value) return "ללא תאריך סיום";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
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

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"interfaces" | "subscriptions">("interfaces");
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [billingCustomers, setBillingCustomers] = useState<BillingCustomerRow[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [employerFilter, setEmployerFilter] = useState("all");
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
    const session = getSession();
    if (!session?.platformAdmin) {
      router.replace("/dashboard");
      return;
    }
    void load();
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
    if (organizationFilter !== "all" && row.organizationId !== organizationFilter) return false;
    if (employerFilter !== "all" && row.employerId !== employerFilter) return false;
    return true;
  });

  return <AppShell title="מסך אדמין" hideScopeController>
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
      <div style={{ overflowX: "auto" }}>
        <table className="admin-interfaces-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["ממשק","הרצה אחרונה","סטטוס","נקלטו","חדשות","עודכנו","הושבתו","פעולות"].map((x) => <th key={x} style={thStyle}>{x}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 24, textAlign: "center" }}>טוען...</td></tr> : rows.map((row) => <tr key={row.key}>
              <td style={cellStyle}><b>{row.name}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{row.key}</div></td>
              <td style={cellStyle}>{formatDate(row.lastRun?.finishedAt ?? row.lastRun?.startedAt)}</td>
              <td style={cellStyle}>{statusLabel(row.lastRun?.status)}</td>
              <td style={cellStyle}>{row.lastRun?.recordsReceived ?? "-"}</td>
              <td style={cellStyle}>{row.lastRun?.recordsInserted ?? "-"}</td>
              <td style={cellStyle}>{row.lastRun?.recordsUpdated ?? "-"}</td>
              <td style={cellStyle}>{row.lastRun?.recordsDeactivated ?? "-"}</td>
              <td className="admin-actions-cell" style={cellStyle}><div className="admin-actions">
                <button className="btn btn-primary" type="button" disabled={Boolean(running)} onClick={() => void runInterface(row.key)}><Play size={15} />{running === row.key ? "מריץ..." : "הרץ עכשיו"}</button>
                <button className="btn btn-secondary" type="button" onClick={() => void openHistory(row.key)}><Eye size={15} />דוחות הרצה</button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section> : <section className="card admin-section-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border, #dce3ea)" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>מנויים</h2>
          <p style={{ margin: "5px 0 0", color: "var(--muted)" }}>כל ארגון וכל מעסיק, המסלול שלו והתעריף שלו.</p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <label className="field" style={{ minWidth: 220 }}>
            <span>ארגון</span>
            <UiSelect value={organizationFilter} onChange={(event) => { setOrganizationFilter(event.target.value); setEmployerFilter("all"); }}>
              {[{ value: "all", label: "כל הארגונים" }].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {organizationOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
          </label>
          <label className="field" style={{ minWidth: 220 }}>
            <span>מעסיק</span>
            <UiSelect value={employerFilter} onChange={(event) => setEmployerFilter(event.target.value)}>
              {[{ value: "all", label: "כל המעסיקים" }].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {employerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
          </label>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="admin-subscriptions-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["ארגון","מעסיק","מסלול","תעריף","אמצעי תשלום","פעולות"].map((x) => <th key={x} style={thStyle}>{x}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>טוען...</td></tr> : filteredBillingCustomers.map((item) => <tr key={`${item.payerType}:${item.payerId}`}>
              <td style={cellStyle}><Link className="profile-link" href={`/organizations/${item.organizationId}`}><b>{item.organizationName}</b></Link></td>
              <td style={cellStyle}>{item.payerType === "Employer" ? <Link className="profile-link" href={`/employers/${item.employerId}`}><b>{item.employerName || item.payerName}</b></Link> : "כל הארגון"}</td>
              <td style={cellStyle}><b>{billingPlanLabel(item.billingType)}</b></td>
              <td style={cellStyle}>{item.billingType === "Free" ? "—" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(item.unitPrice)}</td>
              <td style={cellStyle}>{item.cardLast4 ? `${item.cardBrand || "כרטיס"} •••• ${item.cardLast4}` : "לא מוגדר"}</td>
              <td style={cellStyle}><button className="btn btn-secondary" type="button" onClick={() => openBillingEdit(item)}><Pencil size={15} />עריכת מסלול ותעריף</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}

    {editingBillingCustomer ? <div style={backdropStyle} onClick={() => setEditingBillingCustomer(null)}>
      <div style={{ ...modalStyle, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0 }}>עריכת מסלול ותעריף</h2>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{editingBillingCustomer.payerName}</div>
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setEditingBillingCustomer(null)}>ביטול</button>
          <button className="btn btn-primary" type="button" disabled={savingPricing} onClick={() => void saveBillingEdit()}><Save size={15} />{savingPricing ? "שומר..." : "שמירה"}</button>
        </div>
      </div>
    </div> : null}

    {historyKey ? <div style={backdropStyle} onClick={() => setHistoryKey(null)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}><div><h2 style={{ margin: 0 }}>דוחות הרצה</h2><div style={{ color: "var(--muted)", marginTop: 4 }}>{rows.find((x) => x.key === historyKey)?.name}</div></div><button className="btn btn-secondary" onClick={() => setHistoryKey(null)}><X size={17} /></button></div>
        <div style={{ overflowX: "auto" }}><table className="admin-run-history-table" style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
          <thead><tr>{["תאריך","סטטוס","נקלטו","חדשות","עודכנו","הושבתו","דוח"].map((x) => <th key={x} style={thStyle}>{x}</th>)}</tr></thead>
          <tbody>{history.length === 0 ? <tr><td colSpan={7} style={{ padding: 20, textAlign: "center" }}>אין עדיין הרצות</td></tr> : history.map((run) => <tr key={run.id}>
            <td style={cellStyle}>{formatDate(run.startedAt)}</td><td style={cellStyle}>{statusLabel(run.status)}</td><td style={cellStyle}>{run.recordsReceived}</td><td style={cellStyle}>{run.recordsInserted}</td><td style={cellStyle}>{run.recordsUpdated}</td><td style={cellStyle}>{run.recordsDeactivated}</td>
            <td style={{ ...cellStyle, width: 76 }}><button className="btn btn-secondary" style={{ paddingInline: 12 }} onClick={() => setSelectedRun(run)}>פתח</button></td>
          </tr>)}</tbody>
        </table></div>
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

const thStyle: React.CSSProperties = { textAlign: "right", padding: 12, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
const backdropStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalStyle: React.CSSProperties = { width: "min(950px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "var(--surface)", borderRadius: 16, padding: 20, boxShadow: "0 24px 70px rgba(15,23,42,.25)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 };
const cellStyle: React.CSSProperties = { padding: 10, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
