"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Calculator, CreditCard, RefreshCw, Save, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
import { UiInput, UiSelect, UiTextarea } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type {
  BillingCalculation,
  BillingMetricType,
  BillingPayment,
  BillingPeriod,
  BillingPlan,
  BillingPlanInput,
  BillingPricingComponent,
  BillingUsageRow,
  CorrectionBillingMode,
} from "@/lib/types";

type Tab = "plans" | "periods" | "payments" | "usage";

const tabs = [
  { key: "plans", label: "תוכניות", icon: CreditCard },
  { key: "periods", label: "תקופות חיוב", icon: WalletCards },
  { key: "payments", label: "תשלומים", icon: CreditCard },
  { key: "usage", label: "שימוש", icon: Calculator },
] satisfies Array<{ key: Tab; label: string; icon: typeof CreditCard }>;

const metrics: Array<{ metricType: BillingMetricType; label: string; defaultPricing: 1 | 2 }> = [
  { metricType: 1, label: "מחיר בסיס", defaultPricing: 1 },
  { metricType: 2, label: "מעסיקים", defaultPricing: 2 },
  { metricType: 3, label: "עובדים", defaultPricing: 2 },
  { metricType: 4, label: "שורות דיווח", defaultPricing: 2 },
];

const metricLabels: Record<string, string> = {
  "1": "מחיר בסיס", "2": "מעסיקים", "3": "עובדים", "4": "שורות דיווח", "5": "תיקונים",
  Base: "מחיר בסיס", Employer: "מעסיקים", Employee: "עובדים", ReportRow: "שורות דיווח", Correction: "תיקונים",
};

function emptyComponent(metricType: BillingMetricType, pricingType: 1 | 2): BillingPricingComponent {
  return { metricType, pricingType, unitPrice: 0, includedQuantity: 0, minimumCharge: null, maximumCharge: null, isEnabled: metricType === 1 };
}

function emptyPlan(): BillingPlanInput {
  return {
    code: "", name: "", description: "", currency: "ILS", billingInterval: "Monthly",
    maxEmployers: 1, maxEmployees: 3, maxUsers: 1, isActive: true,
    correctionBillingMode: 1, correctionUnitPrice: null, includedCorrections: 0, includedCorrectionRows: 0,
    effectiveFrom: null,
    components: metrics.map((x) => emptyComponent(x.metricType, x.defaultPricing)),
  };
}

function toDraft(plan: BillingPlan): BillingPlanInput {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? "",
    currency: plan.currency || "ILS",
    billingInterval: plan.billingInterval || "Monthly",
    maxEmployers: plan.maxEmployers,
    maxEmployees: plan.maxEmployees,
    maxUsers: plan.maxUsers,
    isActive: plan.isActive,
    correctionBillingMode: plan.correctionBillingMode,
    correctionUnitPrice: plan.correctionUnitPrice,
    includedCorrections: plan.includedCorrections,
    includedCorrectionRows: plan.includedCorrectionRows,
    effectiveFrom: null,
    components: metrics.map((metric) => {
      const found = plan.components.find((x) => Number(x.metricType) === metric.metricType);
      return found ? { ...found, metricType: metric.metricType } : emptyComponent(metric.metricType, metric.defaultPricing);
    }),
  };
}

function money(value: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date(value));
}

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [usage, setUsage] = useState<BillingUsageRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BillingPlanInput>(emptyPlan());
  const [simulation, setSimulation] = useState({ employers: 3, employees: 180, reportRows: 1400, corrections: 1, correctedRows: 200 });
  const [calculation, setCalculation] = useState<BillingCalculation | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [refundPayment, setRefundPayment] = useState<BillingPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [planRows, periodRows, paymentRows] = await Promise.all([
        alphaApi.billingPlans(),
        alphaApi.platformBillingPeriods(),
        alphaApi.platformBillingPayments(),
      ]);
      setPlans(planRows);
      setPeriods(periodRows);
      setPayments(paymentRows);
      if (!selectedPlanId && planRows[0]) {
        setSelectedPlanId(planRows[0].id);
        setDraft(toDraft(planRows[0]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת נתוני הגבייה נכשלה.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getSession()?.platformAdmin) return;
    void load();
  }, []);

  function selectPlan(plan: BillingPlan) {
    setSelectedPlanId(plan.id);
    setDraft(toDraft(plan));
    setCalculation(null);
  }

  function updateComponent(metricType: BillingMetricType, patch: Partial<BillingPricingComponent>) {
    setDraft((current) => ({
      ...current,
      components: current.components.map((item) => item.metricType === metricType ? { ...item, ...patch } : item),
    }));
  }

  async function savePlan() {
    setSaving(true);
    setError("");
    try {
      const payload = { ...draft, code: draft.code.trim().toUpperCase(), effectiveFrom: new Date().toISOString() };
      const saved = selectedPlanId
        ? await alphaApi.updateBillingPlan(selectedPlanId, payload)
        : await alphaApi.createBillingPlan(payload);
      setSelectedPlanId(saved.id);
      setDraft(toDraft(saved));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת התוכנית נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function simulate() {
    if (!selectedPlanId) return;
    setError("");
    try {
      setCalculation(await alphaApi.simulateBillingPlan(selectedPlanId, simulation));
    } catch (err) {
      setError(err instanceof Error ? err.message : "הסימולציה נכשלה.");
    }
  }

  async function showUsage(periodId: string) {
    setSelectedPeriodId(periodId);
    setUsage(await alphaApi.platformBillingUsage(periodId));
    setTab("usage");
  }

  async function refund() {
    if (!refundPayment) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    setError("");
    try {
      await alphaApi.refundBillingPayment(refundPayment.id, {
        amount,
        reason: refundReason,
        idempotencyKey: "admin-refund-" + refundPayment.id + "-" + crypto.randomUUID(),
      });
      setRefundPayment(null);
      setRefundAmount("");
      setRefundReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "הזיכוי נכשל.");
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan = useMemo(() => plans.find((x) => x.id === selectedPlanId) ?? null, [plans, selectedPlanId]);

  return <AppShell title="Admin Billing" hideScopeController>
    <div className="page-head">
      <div><h1>ניהול גבייה</h1><p>תוכניות, סימולציית תמחור, תקופות חיוב, שימוש, תשלומים וזיכויים.</p></div>
      <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />רענון</button>
    </div>

    <AppTabs items={tabs} activeKey={tab} onChange={setTab} ariaLabel="ניהול גבייה" />
    {error ? <div className="notice notice-error" style={{ margin: "16px 0" }}>{error}</div> : null}

    {tab === "plans" ? <div className="grid" style={{ gridTemplateColumns: "minmax(240px,.55fr) minmax(0,1.45fr)", alignItems: "start", marginTop: 18 }}>
      <section className="card">
        <div className="card-head">
          <h2>תוכניות</h2>
          <button className="btn btn-secondary" onClick={() => { setSelectedPlanId(null); setDraft(emptyPlan()); setCalculation(null); }}>חדשה</button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {plans.map((plan) => <button key={plan.id} type="button" className={"employer" + (plan.id === selectedPlanId ? " active" : "")} onClick={() => selectPlan(plan)}>
            <div className="employer-info"><b>{plan.name}</b><span>{plan.code} · גרסה {plan.version}</span></div>
          </button>)}
        </div>
      </section>

      <div style={{ display: "grid", gap: 18 }}>
        <section className="card">
          <div className="card-head"><h2>{selectedPlan ? "עריכת תוכנית" : "תוכנית חדשה"}</h2></div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <label className="field"><span>שם</span><UiInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label className="field"><span>קוד</span><UiInput value={draft.code} disabled={Boolean(selectedPlanId)} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></label>
            <label className="field" style={{ gridColumn: "1 / -1" }}><span>תיאור</span><UiTextarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          </div>

          <h3 style={{ marginTop: 28 }}>תמחור</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {metrics.map((metric) => {
              const component = draft.components.find((x) => x.metricType === metric.metricType)!;
              return <div key={metric.metricType} style={{ display: "grid", gridTemplateColumns: "170px 110px 1fr 1fr", gap: 12, alignItems: "end", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
                  <input type="checkbox" checked={component.isEnabled} onChange={(e) => updateComponent(metric.metricType, { isEnabled: e.target.checked })} />
                  <b>{metric.label}</b>
                </label>
                <label className="field"><span>סוג</span><UiSelect value={component.pricingType} disabled={metric.metricType === 1} onChange={(e) => updateComponent(metric.metricType, { pricingType: Number(e.target.value) as 1 | 2 })}><option value={1}>קבוע</option><option value={2}>ליחידה</option></UiSelect></label>
                <label className="field"><span>כמות כלולה</span><UiInput type="number" min={0} step="1" value={component.includedQuantity} disabled={!component.isEnabled || metric.metricType === 1} onChange={(e) => updateComponent(metric.metricType, { includedQuantity: Number(e.target.value) })} /></label>
                <label className="field"><span>{metric.metricType === 1 ? "מחיר בסיס" : "מחיר ליחידה נוספת"}</span><UiInput type="number" min={0} step="0.01" value={component.unitPrice} disabled={!component.isEnabled} onChange={(e) => updateComponent(metric.metricType, { unitPrice: Number(e.target.value) })} /></label>
              </div>;
            })}
          </div>

          <h3 style={{ marginTop: 28 }}>תיקונים</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <label className="field"><span>אופן חיוב</span><UiSelect value={draft.correctionBillingMode} onChange={(e) => setDraft({ ...draft, correctionBillingMode: Number(e.target.value) as CorrectionBillingMode })}>
              <option value={1}>ללא חיוב</option><option value={2}>מחיר לכל תיקון</option><option value={3}>מחיר לכל שורה מתוקנת</option><option value={4}>זהה לשורת דיווח רגילה</option>
            </UiSelect></label>
            {draft.correctionBillingMode !== 1 && draft.correctionBillingMode !== 4 ? <label className="field"><span>מחיר</span><UiInput type="number" min={0} step="0.01" value={draft.correctionUnitPrice ?? 0} onChange={(e) => setDraft({ ...draft, correctionUnitPrice: Number(e.target.value) })} /></label> : <div />}
            {draft.correctionBillingMode === 2 ? <label className="field"><span>תיקונים כלולים</span><UiInput type="number" min={0} value={draft.includedCorrections} onChange={(e) => setDraft({ ...draft, includedCorrections: Number(e.target.value) })} /></label> : null}
            {draft.correctionBillingMode === 3 || draft.correctionBillingMode === 4 ? <label className="field"><span>שורות תיקון כלולות</span><UiInput type="number" min={0} value={draft.includedCorrectionRows} onChange={(e) => setDraft({ ...draft, includedCorrectionRows: Number(e.target.value) })} /></label> : null}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => void savePlan()} disabled={saving}><Save size={16} />{saving ? "שומר..." : "שמירת תוכנית"}</button>
          </div>
        </section>

        {selectedPlanId ? <section className="card">
          <div className="card-head"><div><h2>סימולציית מחיר</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>הסימולציה משתמשת באותו BillingCalculator של החיוב בפועל.</p></div></div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>
            {([
              ["employers", "מעסיקים"], ["employees", "עובדים"], ["reportRows", "שורות"], ["corrections", "פעולות תיקון"], ["correctedRows", "שורות מתוקנות"],
            ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><UiInput type="number" min={0} value={simulation[key]} onChange={(e) => setSimulation({ ...simulation, [key]: Number(e.target.value) })} /></label>)}
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => void simulate()}><Calculator size={16} />חשב מחיר</button>
          {calculation ? <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
            {calculation.components.map((line) => <div key={String(line.metric)} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBlock: 7 }}><span>{metricLabels[String(line.metric)] ?? String(line.metric)} · {line.billableQuantity.toLocaleString("he-IL")} לחיוב</span><b>{money(line.amount, draft.currency)}</b></div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, paddingTop: 8 }}><b>סה״כ</b><b>{money(calculation.total, draft.currency)}</b></div>
          </div> : null}
        </section> : null}
      </div>
    </div> : null}

    {tab === "periods" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head"><h2>תקופות חיוב</h2></div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["תקופה","חשבון","סטטוס","סכום","פעולות"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{periods.map((row) => <tr key={row.id}><td style={td}>{shortDate(row.periodStart)}–{shortDate(row.periodEnd)}</td><td style={td}>{row.billingAccountId}</td><td style={td}>{String(row.status)}</td><td style={td}><b>{money(row.total,row.currency)}</b></td><td style={td}><button className="btn btn-secondary" onClick={() => void showUsage(row.id)}>שימוש</button></td></tr>)}</tbody>
      </table>
    </section> : null}

    {tab === "payments" ? <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <section className="card" style={{ overflowX: "auto" }}>
        <div className="card-head"><h2>תשלומים</h2></div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["תאריך","Provider","סטטוס","סכום","עסקה","פעולות"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
          <tbody>{payments.map((row) => <tr key={row.id}><td style={td}>{shortDate(row.createdAt)}</td><td style={td}>{row.provider || "—"}</td><td style={td}>{String(row.status)}</td><td style={td}><b>{money(row.amount,row.currency)}</b></td><td style={td}>{row.providerTransactionId || "—"}</td><td style={td}><button className="btn btn-secondary" disabled={!["3","Succeeded","6","PartiallyRefunded"].includes(String(row.status))} onClick={() => { setRefundPayment(row); setRefundAmount(String(row.amount)); }}>זיכוי</button></td></tr>)}</tbody>
        </table>
      </section>
      {refundPayment ? <section className="card">
        <div className="card-head"><h2>זיכוי תשלום</h2></div>
        <div className="grid" style={{ gridTemplateColumns: "200px 1fr" }}>
          <label className="field"><span>סכום</span><UiInput type="number" min={0.01} step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} /></label>
          <label className="field"><span>סיבה</span><UiInput value={refundReason} onChange={(e) => setRefundReason(e.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="btn btn-primary" onClick={() => void refund()} disabled={saving}>בצע זיכוי</button><button className="btn btn-secondary" onClick={() => setRefundPayment(null)}>ביטול</button></div>
      </section> : null}
    </div> : null}

    {tab === "usage" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head"><div><h2>שימוש לחיוב</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>{selectedPeriodId ? "תקופה " + selectedPeriodId : "בחרו תקופה ממסך תקופות חיוב"}</p></div></div>
      {usage.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Metric","כמות","כלול","לחיוב","מחיר יחידה","סכום"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
        <tbody>{usage.map((row) => <tr key={row.id}><td style={td}>{metricLabels[String(row.metricType)] ?? String(row.metricType)}</td><td style={td}>{row.quantity}</td><td style={td}>{row.includedQuantity}</td><td style={td}>{row.billableQuantity}</td><td style={td}>{money(row.unitPrice)}</td><td style={td}><b>{money(row.amount)}</b></td></tr>)}</tbody>
      </table> : <div className="empty">אין נתוני שימוש להצגה.</div>}
    </section> : null}
  </AppShell>;
}

const th: CSSProperties = { textAlign: "right", padding: 12, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: 12, borderBottom: "1px solid var(--line)", verticalAlign: "middle" };
