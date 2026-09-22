"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Calculator,
  CreditCard,
  Layers3,
  Play,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react";
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
  BillingPricingTier,
  BillingRefund,
  BillingUsageRow,
  CorrectionBillingMode,
  PlatformSubscription,
} from "@/lib/types";

type Tab = "plans" | "subscriptions" | "periods" | "payments" | "refunds" | "usage";

const tabs = [
  { key: "plans", label: "תוכניות", icon: Layers3 },
  { key: "subscriptions", label: "מנויים", icon: UsersRound },
  { key: "periods", label: "תקופות חיוב", icon: WalletCards },
  { key: "payments", label: "תשלומים", icon: CreditCard },
  { key: "refunds", label: "זיכויים", icon: RotateCcw },
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
  return {
    metricType,
    pricingType,
    unitPrice: 0,
    includedQuantity: 0,
    minimumCharge: null,
    maximumCharge: null,
    isEnabled: metricType === 1,
    tiers: [],
  };
}

function emptyPlan(): BillingPlanInput {
  return {
    code: "",
    name: "",
    description: "",
    currency: "ILS",
    billingInterval: "Monthly",
    maxEmployers: 1,
    maxEmployees: 3,
    maxUsers: 1,
    isActive: true,
    correctionBillingMode: 1,
    correctionUnitPrice: null,
    includedCorrections: 0,
    includedCorrectionRows: 0,
    effectiveFrom: null,
    components: metrics.map((item) => emptyComponent(item.metricType, item.defaultPricing)),
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
      const found = plan.components.find((item) => Number(item.metricType) === metric.metricType);
      return found
        ? { ...found, metricType: metric.metricType, tiers: found.tiers?.map((tier) => ({ ...tier })) ?? [] }
        : emptyComponent(metric.metricType, metric.defaultPricing);
    }),
  };
}

function money(value: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(new Date(value));
}

function periodStatus(status: string | number) {
  return ({
    "1": "פתוחה", "2": "חושבה", "3": "בתהליך חיוב", "4": "שולמה", "5": "באיחור", "6": "מושהית", "7": "בוטלה",
    Open: "פתוחה", Calculated: "חושבה", Charging: "בתהליך חיוב", Charged: "שולמה", PastDue: "באיחור", Suspended: "מושהית", Cancelled: "בוטלה",
  } as Record<string, string>)[String(status)] ?? String(status);
}

function paymentStatus(status: string | number) {
  return ({
    "1": "ממתין", "2": "בתהליך", "3": "שולם", "4": "נכשל", "5": "זוכה", "6": "זוכה חלקית", "7": "בוטל",
    Pending: "ממתין", Processing: "בתהליך", Succeeded: "שולם", Failed: "נכשל", Refunded: "זוכה", PartiallyRefunded: "זוכה חלקית", Cancelled: "בוטל",
  } as Record<string, string>)[String(status)] ?? String(status);
}

function refundStatus(status: string | number) {
  return ({
    "1": "ממתין", "2": "בוצע", "3": "נכשל",
    Pending: "ממתין", Succeeded: "בוצע", Failed: "נכשל",
  } as Record<string, string>)[String(status)] ?? String(status);
}

function subscriptionStatus(status: string | number) {
  return ({
    "1": "פעיל", "2": "מושהה", "3": "פג תוקף", "4": "בוטל", "5": "תשלום באיחור",
    Active: "פעיל", Suspended: "מושהה", Expired: "פג תוקף", Cancelled: "בוטל", PastDue: "תשלום באיחור",
  } as Record<string, string>)[String(status)] ?? String(status);
}

function isoFromLocal(value: string | null) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [usage, setUsage] = useState<BillingUsageRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BillingPlanInput>(emptyPlan());
  const [simulation, setSimulation] = useState({ employers: 3, employees: 180, reportRows: 1400, corrections: 1, correctedRows: 200 });
  const [calculation, setCalculation] = useState<BillingCalculation | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [refundPayment, setRefundPayment] = useState<BillingPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [runAccountId, setRunAccountId] = useState("");
  const [runStart, setRunStart] = useState("");
  const [runEnd, setRunEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [planRows, subscriptionRows, periodRows, paymentRows, refundRows] = await Promise.all([
        alphaApi.billingPlans(),
        alphaApi.platformSubscriptions(),
        alphaApi.platformBillingPeriods(),
        alphaApi.platformBillingPayments(),
        alphaApi.platformBillingRefunds(),
      ]);
      setPlans(planRows);
      setSubscriptions(subscriptionRows);
      setPeriods(periodRows);
      setPayments(paymentRows);
      setRefunds(refundRows);
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
      components: current.components.map((item) =>
        item.metricType === metricType ? { ...item, ...patch } : item),
    }));
  }

  function updateTier(metricType: BillingMetricType, index: number, patch: Partial<BillingPricingTier>) {
    setDraft((current) => ({
      ...current,
      components: current.components.map((item) => {
        if (item.metricType !== metricType) return item;
        const tiers = [...(item.tiers ?? [])];
        tiers[index] = { ...tiers[index], ...patch };
        return { ...item, tiers };
      }),
    }));
  }

  function addTier(metricType: BillingMetricType) {
    setDraft((current) => ({
      ...current,
      components: current.components.map((item) => {
        if (item.metricType !== metricType) return item;
        const tiers = [...(item.tiers ?? [])];
        const previous = tiers[tiers.length - 1];
        const fromQuantity = previous?.toQuantity ?? 0;
        if (previous && previous.toQuantity === null)
          tiers[tiers.length - 1] = { ...previous, toQuantity: previous.fromQuantity + 100 };
        const normalizedFrom = tiers[tiers.length - 1]?.toQuantity ?? fromQuantity;
        tiers.push({ fromQuantity: normalizedFrom, toQuantity: null, unitPrice: 0 });
        return { ...item, tiers };
      }),
    }));
  }

  function removeTier(metricType: BillingMetricType, index: number) {
    setDraft((current) => ({
      ...current,
      components: current.components.map((item) => {
        if (item.metricType !== metricType) return item;
        const tiers = (item.tiers ?? []).filter((_, tierIndex) => tierIndex !== index);
        if (tiers.length) tiers[tiers.length - 1] = { ...tiers[tiers.length - 1], toQuantity: null };
        return { ...item, tiers };
      }),
    }));
  }

  async function savePlan() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        effectiveFrom: isoFromLocal(draft.effectiveFrom),
      };
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
    try {
      setUsage(await alphaApi.platformBillingUsage(periodId));
      setTab("usage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת השימוש נכשלה.");
    }
  }

  async function changeSubscriptionPlan(organizationId: string, planId: string) {
    setSaving(true);
    try {
      await alphaApi.changePlatformSubscriptionPlan(organizationId, planId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שינוי המסלול נכשל.");
    } finally {
      setSaving(false);
    }
  }

  async function changeSubscriptionStatus(organizationId: string, status: number) {
    setSaving(true);
    try {
      await alphaApi.changePlatformSubscriptionStatus(organizationId, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שינוי סטטוס המנוי נכשל.");
    } finally {
      setSaving(false);
    }
  }

  async function runPeriod(charge: boolean, period?: BillingPeriod) {
    const billingAccountId = period?.billingAccountId ?? runAccountId.trim();
    const periodStart = period?.periodStart ?? (runStart ? new Date(runStart).toISOString() : "");
    const periodEnd = period?.periodEnd ?? (runEnd ? new Date(runEnd).toISOString() : "");
    if (!billingAccountId || !periodStart || !periodEnd) {
      setError("יש למלא חשבון חיוב, תחילת תקופה וסוף תקופה.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await alphaApi.runBillingPeriod(billingAccountId, { periodStart, periodEnd, charge });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "הרצת תקופת החיוב נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  const refundedByPayment = useMemo(() => {
    const totals = new Map<string, number>();
    for (const refund of refunds) {
      if (!["2", "Succeeded"].includes(String(refund.status))) continue;
      totals.set(refund.paymentId, (totals.get(refund.paymentId) ?? 0) + refund.amount);
    }
    return totals;
  }, [refunds]);

  function openRefund(payment: BillingPayment) {
    const remaining = Math.max(0, payment.amount - (refundedByPayment.get(payment.id) ?? 0));
    setRefundPayment(payment);
    setRefundAmount(String(remaining));
    setRefundReason("");
  }

  async function refund() {
    if (!refundPayment) return;
    const amount = Number(refundAmount);
    const remaining = Math.max(0, refundPayment.amount - (refundedByPayment.get(refundPayment.id) ?? 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      setError("סכום הזיכוי אינו תקין או גדול מהיתרה לזיכוי.");
      return;
    }

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

  const selectedPlan = useMemo(
    () => plans.find((item) => item.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  if (!getSession()?.platformAdmin) {
    return <AppShell title="Admin Billing" hideScopeController>
      <div className="notice notice-error">אין הרשאת Platform Admin למסך זה.</div>
    </AppShell>;
  }

  return <AppShell title="Admin Billing" hideScopeController>
    <div className="page-head">
      <div>
        <h1>ניהול גבייה</h1>
        <p>מסלולים ותמחור, מנויים, תקופות חיוב, שימוש, תשלומים וזיכויים.</p>
      </div>
      <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={16} />רענון
      </button>
    </div>

    <AppTabs items={tabs} activeKey={tab} onChange={setTab} ariaLabel="ניהול גבייה" />
    {error ? <div className="notice notice-error" style={{ margin: "16px 0" }}>{error}</div> : null}

    {tab === "plans" ? <div className="grid" style={{ gridTemplateColumns: "minmax(240px,.45fr) minmax(0,1.55fr)", alignItems: "start", marginTop: 18 }}>
      <section className="card">
        <div className="card-head">
          <h2>תוכניות</h2>
          <button className="btn btn-secondary" onClick={() => {
            setSelectedPlanId(null);
            setDraft(emptyPlan());
            setCalculation(null);
          }}>
            <Plus size={16} />חדשה
          </button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {plans.map((plan) => <button
            key={plan.id}
            type="button"
            className={"employer" + (plan.id === selectedPlanId ? " active" : "")}
            onClick={() => selectPlan(plan)}
          >
            <div className="employer-info">
              <b>{plan.name}</b>
              <span>{plan.code} · גרסה {plan.version} · {plan.isActive ? "פעילה" : "לא פעילה"}</span>
            </div>
          </button>)}
        </div>
      </section>

      <div style={{ display: "grid", gap: 18 }}>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>{selectedPlan ? "עריכת תוכנית" : "תוכנית חדשה"}</h2>
              <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>
                שינוי מחיר יוצר גרסה חדשה ואינו משנה תקופות היסטוריות.
              </p>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <label className="field"><span>שם</span><UiInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label className="field"><span>קוד</span><UiInput value={draft.code} disabled={Boolean(selectedPlanId)} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
            <label className="field"><span>מטבע</span><UiSelect value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })}><option value="ILS">ILS</option></UiSelect></label>
            <label className="field"><span>מקסימום מעסיקים</span><UiInput type="number" min={0} value={draft.maxEmployers} onChange={(event) => setDraft({ ...draft, maxEmployers: Number(event.target.value) })} /></label>
            <label className="field"><span>מקסימום עובדים</span><UiInput type="number" min={0} value={draft.maxEmployees} onChange={(event) => setDraft({ ...draft, maxEmployees: Number(event.target.value) })} /></label>
            <label className="field"><span>מקסימום משתמשים</span><UiInput type="number" min={0} value={draft.maxUsers} onChange={(event) => setDraft({ ...draft, maxUsers: Number(event.target.value) })} /></label>
            <label className="field"><span>בתוקף מתאריך</span><UiInput type="datetime-local" value={draft.effectiveFrom ?? ""} onChange={(event) => setDraft({ ...draft, effectiveFrom: event.target.value || null })} /></label>
            <label className="field"><span>סטטוס</span><UiSelect value={draft.isActive ? "1" : "0"} onChange={(event) => setDraft({ ...draft, isActive: event.target.value === "1" })}><option value="1">פעילה</option><option value="0">לא פעילה</option></UiSelect></label>
            <label className="field"><span>מחזור חיוב</span><UiSelect value={draft.billingInterval} onChange={(event) => setDraft({ ...draft, billingInterval: event.target.value })}><option value="Monthly">חודשי</option></UiSelect></label>
            <label className="field" style={{ gridColumn: "1 / -1" }}><span>תיאור</span><UiTextarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          </div>

          <h3 style={{ marginTop: 28 }}>תמחור</h3>
          <div style={{ display: "grid", gap: 14 }}>
            {metrics.map((metric) => {
              const component = draft.components.find((item) => item.metricType === metric.metricType)!;
              return <section key={metric.metricType} style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "150px 150px repeat(4,minmax(120px,1fr))", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 12 }}>
                    <UiInput type="checkbox" checked={component.isEnabled} onChange={(event) => updateComponent(metric.metricType, { isEnabled: event.target.checked })} />
                    <b>{metric.label}</b>
                  </label>

                  <label className="field"><span>סוג תמחור</span><UiSelect
                    value={component.pricingType}
                    disabled={metric.metricType === 1}
                    onChange={(event) => {
                      const pricingType = Number(event.target.value) as 1 | 2 | 3;
                      updateComponent(metric.metricType, {
                        pricingType,
                        tiers: pricingType === 3 && !(component.tiers?.length)
                          ? [{ fromQuantity: 0, toQuantity: null, unitPrice: component.unitPrice }]
                          : component.tiers,
                      });
                    }}
                  >
                    <option value={1}>קבוע</option>
                    <option value={2}>ליחידה</option>
                    <option value={3}>מדרגות</option>
                  </UiSelect></label>

                  <label className="field"><span>כמות כלולה</span><UiInput type="number" min={0} step="1" value={component.includedQuantity} disabled={!component.isEnabled || metric.metricType === 1} onChange={(event) => updateComponent(metric.metricType, { includedQuantity: Number(event.target.value) })} /></label>
                  <label className="field"><span>מחיר יחידה</span><UiInput type="number" min={0} step="0.01" value={component.unitPrice} disabled={!component.isEnabled || component.pricingType === 3} onChange={(event) => updateComponent(metric.metricType, { unitPrice: Number(event.target.value) })} /></label>
                  <label className="field"><span>מינימום חיוב</span><UiInput type="number" min={0} step="0.01" value={component.minimumCharge ?? ""} disabled={!component.isEnabled} onChange={(event) => updateComponent(metric.metricType, { minimumCharge: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                  <label className="field"><span>מקסימום חיוב</span><UiInput type="number" min={0} step="0.01" value={component.maximumCharge ?? ""} disabled={!component.isEnabled} onChange={(event) => updateComponent(metric.metricType, { maximumCharge: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                </div>

                {component.pricingType === 3 && component.isEnabled ? <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div className="card-head">
                    <div><b>מדרגות מחיר</b><div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>המדרגה הראשונה מתחילה ב־0 והאחרונה ללא גבול עליון.</div></div>
                    <button className="btn btn-secondary" type="button" onClick={() => addTier(metric.metricType)}><Plus size={15} />מדרגה</button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {(component.tiers ?? []).map((tier, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                      <label className="field"><span>מכמות</span><UiInput type="number" min={0} value={tier.fromQuantity} onChange={(event) => updateTier(metric.metricType, index, { fromQuantity: Number(event.target.value) })} /></label>
                      <label className="field"><span>עד כמות</span><UiInput type="number" min={0} value={tier.toQuantity ?? ""} placeholder="ללא הגבלה" onChange={(event) => updateTier(metric.metricType, index, { toQuantity: event.target.value === "" ? null : Number(event.target.value) })} /></label>
                      <label className="field"><span>מחיר ליחידה</span><UiInput type="number" min={0} step="0.01" value={tier.unitPrice} onChange={(event) => updateTier(metric.metricType, index, { unitPrice: Number(event.target.value) })} /></label>
                      <button className="btn btn-secondary" type="button" onClick={() => removeTier(metric.metricType, index)} aria-label="מחיקת מדרגה"><Trash2 size={16} /></button>
                    </div>)}
                  </div>
                </div> : null}
              </section>;
            })}
          </div>

          <h3 style={{ marginTop: 28 }}>תיקונים</h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
            <label className="field"><span>אופן חיוב</span><UiSelect value={draft.correctionBillingMode} onChange={(event) => setDraft({ ...draft, correctionBillingMode: Number(event.target.value) as CorrectionBillingMode })}>
              <option value={1}>ללא חיוב</option>
              <option value={2}>מחיר לכל תיקון</option>
              <option value={3}>מחיר לכל שורה מתוקנת</option>
              <option value={4}>זהה לשורת דיווח רגילה</option>
            </UiSelect></label>
            {draft.correctionBillingMode !== 1 && draft.correctionBillingMode !== 4
              ? <label className="field"><span>מחיר</span><UiInput type="number" min={0} step="0.01" value={draft.correctionUnitPrice ?? 0} onChange={(event) => setDraft({ ...draft, correctionUnitPrice: Number(event.target.value) })} /></label>
              : <div />}
            {draft.correctionBillingMode === 2
              ? <label className="field"><span>תיקונים כלולים</span><UiInput type="number" min={0} value={draft.includedCorrections} onChange={(event) => setDraft({ ...draft, includedCorrections: Number(event.target.value) })} /></label>
              : null}
            {draft.correctionBillingMode === 3 || draft.correctionBillingMode === 4
              ? <label className="field"><span>שורות תיקון כלולות</span><UiInput type="number" min={0} value={draft.includedCorrectionRows} onChange={(event) => setDraft({ ...draft, includedCorrectionRows: Number(event.target.value) })} /></label>
              : null}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => void savePlan()} disabled={saving}><Save size={16} />{saving ? "שומר..." : "שמירת תוכנית"}</button>
          </div>
        </section>

        {selectedPlanId ? <section className="card">
          <div className="card-head">
            <div>
              <h2>סימולציית מחיר</h2>
              <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>אותו BillingCalculator שמשמש את החיוב בפועל.</p>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>
            {([
              ["employers", "מעסיקים"],
              ["employees", "עובדים"],
              ["reportRows", "שורות"],
              ["corrections", "פעולות תיקון"],
              ["correctedRows", "שורות מתוקנות"],
            ] as const).map(([key, label]) => <label className="field" key={key}>
              <span>{label}</span>
              <UiInput type="number" min={0} value={simulation[key]} onChange={(event) => setSimulation({ ...simulation, [key]: Number(event.target.value) })} />
            </label>)}
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={() => void simulate()}><Calculator size={16} />חשב מחיר</button>
          {calculation ? <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
            {calculation.components.map((line) => <div key={String(line.metric)} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBlock: 7 }}>
              <span>{metricLabels[String(line.metric)] ?? String(line.metric)} · {line.billableQuantity.toLocaleString("he-IL")} לחיוב</span>
              <b>{money(line.amount, draft.currency)}</b>
            </div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, paddingTop: 8 }}><b>סה״כ</b><b>{money(calculation.total, draft.currency)}</b></div>
          </div> : null}
        </section> : null}
      </div>
    </div> : null}

    {tab === "subscriptions" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head"><div><h2>מנויים</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>שיוך תוכנית וסטטוס מנוי לכל ארגון.</p></div></div>
      {subscriptions.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["ארגון", "תוכנית", "סטטוס", "התחלה", "תוקף"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
        <tbody>{subscriptions.map((row) => <tr key={row.subscriptionId}>
          <td style={td}><b>{row.organizationName}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{row.organizationId}</div></td>
          <td style={td}><UiSelect value={row.planId} disabled={saving} onChange={(event) => void changeSubscriptionPlan(row.organizationId, event.target.value)}>
            {plans.filter((plan) => plan.isActive || plan.id === row.planId).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.code}</option>)}
          </UiSelect></td>
          <td style={td}><UiSelect value={String(row.status)} disabled={saving} onChange={(event) => void changeSubscriptionStatus(row.organizationId, Number(event.target.value))}>
            <option value="1">פעיל</option>
            <option value="2">מושהה</option>
            <option value="3">פג תוקף</option>
            <option value="4">בוטל</option>
            <option value="5">תשלום באיחור</option>
          </UiSelect><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{subscriptionStatus(row.status)}</div></td>
          <td style={td}>{shortDate(row.startedAt)}</td>
          <td style={td}>{row.expiresAt ? shortDate(row.expiresAt) : "ללא הגבלה"}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">אין מנויים להצגה.</div>}
    </section> : null}

    {tab === "periods" ? <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <section className="card">
        <div className="card-head"><div><h2>הרצת תקופה ידנית</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>כל הפעולות idempotent. הרצה חוזרת לא יוצרת חיוב כפול.</p></div></div>
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <label className="field"><span>Billing Account ID</span><UiInput value={runAccountId} onChange={(event) => setRunAccountId(event.target.value)} placeholder="UUID" /></label>
          <label className="field"><span>מתאריך</span><UiInput type="datetime-local" value={runStart} onChange={(event) => setRunStart(event.target.value)} /></label>
          <label className="field"><span>עד תאריך</span><UiInput type="datetime-local" value={runEnd} onChange={(event) => setRunEnd(event.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={saving} onClick={() => void runPeriod(false)}><Calculator size={16} />חשב בלבד</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => void runPeriod(true)}><Play size={16} />חשב וחייב</button>
        </div>
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <div className="card-head"><h2>תקופות חיוב</h2></div>
        {periods.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["תקופה", "חשבון", "סטטוס", "סכום", "חושב", "שולם", "פעולות"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
          <tbody>{periods.map((row) => <tr key={row.id}>
            <td style={td}>{shortDate(row.periodStart)}–{shortDate(row.periodEnd)}</td>
            <td style={td}><code>{row.billingAccountId}</code></td>
            <td style={td}>{periodStatus(row.status)}</td>
            <td style={td}><b>{money(row.total, row.currency)}</b></td>
            <td style={td}>{row.calculatedAt ? shortDate(row.calculatedAt) : "—"}</td>
            <td style={td}>{row.chargedAt ? shortDate(row.chargedAt) : "—"}</td>
            <td style={td}><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <button className="btn btn-secondary" onClick={() => void showUsage(row.id)}>שימוש</button>
              {!["4", "Charged"].includes(String(row.status)) ? <button className="btn btn-secondary" disabled={saving} onClick={() => void runPeriod(true, row)}>חייב עכשיו</button> : null}
            </div></td>
          </tr>)}</tbody>
        </table> : <div className="empty">אין תקופות חיוב.</div>}
      </section>
    </div> : null}

    {tab === "payments" ? <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <section className="card" style={{ overflowX: "auto" }}>
        <div className="card-head"><h2>תשלומים</h2></div>
        {payments.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["תאריך", "חשבון", "Provider", "סטטוס", "סכום", "זוכה", "עסקה", "פעולות"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
          <tbody>{payments.map((row) => {
            const refunded = refundedByPayment.get(row.id) ?? 0;
            const remaining = Math.max(0, row.amount - refunded);
            return <tr key={row.id}>
              <td style={td}>{shortDate(row.createdAt)}</td>
              <td style={td}><code>{row.billingAccountId}</code></td>
              <td style={td}>{row.provider || "—"}</td>
              <td style={td}>{paymentStatus(row.status)}{row.failureMessage ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.failureMessage}</div> : null}</td>
              <td style={td}><b>{money(row.amount, row.currency)}</b></td>
              <td style={td}>{refunded ? money(refunded, row.currency) : "—"}</td>
              <td style={td}>{row.providerTransactionId || "—"}</td>
              <td style={td}><button
                className="btn btn-secondary"
                disabled={remaining <= 0 || !["3", "Succeeded", "6", "PartiallyRefunded"].includes(String(row.status))}
                onClick={() => openRefund(row)}
              >זיכוי{remaining > 0 ? ` · ${money(remaining, row.currency)}` : ""}</button></td>
            </tr>;
          })}</tbody>
        </table> : <div className="empty">אין תשלומים.</div>}
      </section>

      {refundPayment ? <section className="card">
        <div className="card-head"><div><h2>זיכוי תשלום</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>אפשר זיכוי מלא או חלקי עד היתרה שנותרה.</p></div></div>
        <div className="grid" style={{ gridTemplateColumns: "200px 1fr" }}>
          <label className="field"><span>סכום</span><UiInput type="number" min={0.01} step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></label>
          <label className="field"><span>סיבה</span><UiInput value={refundReason} onChange={(event) => setRefundReason(event.target.value)} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => void refund()} disabled={saving}>בצע זיכוי</button>
          <button className="btn btn-secondary" onClick={() => setRefundPayment(null)}>ביטול</button>
        </div>
      </section> : null}
    </div> : null}

    {tab === "refunds" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head"><div><h2>היסטוריית זיכויים</h2><p style={{ color: "var(--muted)", margin: "5px 0 0" }}>כולל זיכויים מלאים, חלקיים וכשלונות.</p></div></div>
      {refunds.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["תאריך", "Payment ID", "סכום", "סטטוס", "סיבה", "Provider Refund ID"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
        <tbody>{refunds.map((row) => <tr key={row.id}>
          <td style={td}>{shortDate(row.createdAt)}</td>
          <td style={td}><code>{row.paymentId}</code></td>
          <td style={td}><b>{money(row.amount)}</b></td>
          <td style={td}>{refundStatus(row.status)}{row.errorMessage ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.errorMessage}</div> : null}</td>
          <td style={td}>{row.reason || "—"}</td>
          <td style={td}>{row.providerRefundId || "—"}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">אין זיכויים.</div>}
    </section> : null}

    {tab === "usage" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head">
        <div>
          <h2>שימוש לחיוב</h2>
          <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>{selectedPeriodId ? "תקופה " + selectedPeriodId : "בחרו תקופה ממסך תקופות חיוב"}</p>
        </div>
        {selectedPeriodId ? <ReceiptText size={22} /> : null}
      </div>
      {usage.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Metric", "מעסיק", "כמות", "כלול", "לחיוב", "מחיר יחידה", "סכום", "מקור"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
        <tbody>{usage.map((row) => <tr key={row.id}>
          <td style={td}>{metricLabels[String(row.metricType)] ?? String(row.metricType)}</td>
          <td style={td}>{row.employerId ?? "—"}</td>
          <td style={td}>{row.quantity}</td>
          <td style={td}>{row.includedQuantity}</td>
          <td style={td}>{row.billableQuantity}</td>
          <td style={td}>{money(row.unitPrice)}</td>
          <td style={td}><b>{money(row.amount)}</b></td>
          <td style={td}>{row.sourceType ? `${row.sourceType} · ${row.sourceId}` : "snapshot תקופתי"}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">אין נתוני שימוש להצגה.</div>}
    </section> : null}
  </AppShell>;
}

const th: CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid var(--line)",
  verticalAlign: "middle",
};
