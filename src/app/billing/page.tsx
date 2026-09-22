"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Landmark,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection, getOrganizationSelection } from "@/lib/session";
import type {
  BillingCalculationLine,
  BillingPayment,
  BillingPeriod,
  BillingCustomerContext,
} from "@/lib/types";

const metricLabels: Record<string, string> = {
  "1": "מחיר בסיס",
  "2": "מעסיקים",
  "3": "עובדים",
  "4": "שורות דיווח",
  "5": "תיקונים",
  Base: "מחיר בסיס",
  Employer: "מעסיקים",
  Employee: "עובדים",
  ReportRow: "שורות דיווח",
  Correction: "תיקונים",
};

type BillingContext = BillingCustomerContext;

function money(value: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(new Date(value));
}

function periodStatusLabel(status: string | number) {
  const value = String(status);
  return ({
    "1": "פתוחה",
    "2": "חושבה",
    "3": "בתהליך חיוב",
    "4": "שולמה",
    "5": "באיחור",
    "6": "מושהית",
    "7": "בוטלה",
    Open: "פתוחה",
    Calculated: "חושבה",
    Charging: "בתהליך חיוב",
    Charged: "שולמה",
    PastDue: "באיחור",
    Suspended: "מושהית",
    Cancelled: "בוטלה",
  } as Record<string, string>)[value] ?? value;
}

function paymentStatusLabel(status: string | number) {
  const value = String(status);
  return ({
    "1": "ממתין",
    "2": "בתהליך",
    "3": "שולם",
    "4": "נכשל",
    "5": "זוכה",
    "6": "זוכה חלקית",
    "7": "בוטל",
    Pending: "ממתין",
    Processing: "בתהליך",
    Succeeded: "שולם",
    Failed: "נכשל",
    Refunded: "זוכה",
    PartiallyRefunded: "זוכה חלקית",
    Cancelled: "בוטל",
  } as Record<string, string>)[value] ?? value;
}

function accountStatusLabel(status: number) {
  return ({
    1: "ממתין להגדרה",
    2: "פעיל",
    3: "תשלום באיחור",
    4: "מושהה",
    5: "בוטל",
  } as Record<number, string>)[status] ?? String(status);
}

function snapshotLines(period: BillingPeriod): BillingCalculationLine[] {
  if (!period.calculationSnapshotJson) return [];
  try {
    const parsed = JSON.parse(period.calculationSnapshotJson) as { components?: BillingCalculationLine[] };
    return parsed.components ?? [];
  } catch {
    return [];
  }
}

function cardSummary(account: BillingCustomerContext["account"]) {
  if (account.paymentMethodType === 2) {
    return account.hasBankDebitMandate
      ? "הרשאה לחיוב חשבון מחוברת"
      : "הרשאה לחיוב חשבון לא הוגדרה";
  }

  if (!account.configured || account.paymentMethodStatus !== 3) return "כרטיס אשראי לא הוגדר";
  const brand = account.cardBrand || "כרטיס";
  const last4 = account.cardLast4 ? ` •••• ${account.cardLast4}` : "";
  const expiry = account.cardExpiryMonth && account.cardExpiryYear
    ? ` · ${String(account.cardExpiryMonth).padStart(2, "0")}/${account.cardExpiryYear}`
    : "";
  return `${brand}${last4}${expiry}`;
}

export default function BillingPage() {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [context, setContext] = useState<BillingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (scope?: { organizationId: string; employerId?: string }) => {
    const organizationId = scope?.organizationId ?? getOrganizationSelection();
    const savedEmployer = getEmployerSelection();
    const employerId = scope?.employerId ??
      (savedEmployer?.organizationId === organizationId ? savedEmployer.employerId : undefined);

    if (!organizationId) {
      setError("יש לבחור ארגון כדי לצפות בחיובים.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (employerId) {
        const [billingContext, periodRows, paymentRows] = await Promise.all([
          alphaApi.employerBillingContext(organizationId, employerId),
          alphaApi.employerBillingPeriods(organizationId, employerId),
          alphaApi.employerBillingPayments(organizationId, employerId),
        ]) as [BillingCustomerContext, BillingPeriod[], BillingPayment[]];

        setContext(billingContext);
        setPeriods(periodRows);
        setPayments(paymentRows);
      } else {
        const [billingContext, periodRows, paymentRows] = await Promise.all([
          alphaApi.organizationBillingContext(organizationId),
          alphaApi.organizationBillingPeriods(organizationId),
          alphaApi.organizationBillingPayments(organizationId),
        ]);

        setContext(billingContext);
        setPeriods(periodRows);
        setPayments(paymentRows);
      }
    } catch (err) {
      setContext(null);
      setPeriods([]);
      setPayments([]);
      setError(err instanceof Error ? err.message : "טעינת נתוני החיוב נכשלה.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const onScopeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      void load(detail);
    };
    window.addEventListener("alpha:scope-change", onScopeChange);
    return () => window.removeEventListener("alpha:scope-change", onScopeChange);
  }, [load]);

  const latest = periods[0] ?? null;
  const latestPayment = payments[0] ?? null;
  const lines = useMemo(() => latest ? snapshotLines(latest) : [], [latest]);
  const account = context?.account ?? null;

  const settingsHref = context
    ? context.source === "Organization"
      ? `/organizations/${context.organizationId}`
      : `/employers/${context.employerId}?organizationId=${context.organizationId}`
    : "/settings";

  const needsAttention = Boolean(
    account && (
      account.status === 3 ||
      account.status === 4 ||
      account.paymentMethodStatus !== 3 ||
      String(latestPayment?.status) === "4" ||
      String(latestPayment?.status) === "Failed"
    )
  );

  return <AppShell title="חיובים">
    <div className="page-head">
      <div>
        <h1>חיובים</h1>
        <p>סטטוס החשבון, שימוש, תקופות חיוב ותשלומים עבור ALPHA.</p>
      </div>
      {context ? <div className="form-actions" style={{ margin: 0 }}>
        <button className="btn btn-secondary" type="button" onClick={() => void load()}>
          <RefreshCw size={16} />רענון
        </button>
        {context.canManageBilling ? <Link className="btn btn-primary" href={settingsHref}>
          <CreditCard size={16} />פרטי חיוב ואמצעי תשלום
        </Link> : null}
      </div> : null}
    </div>

    {error ? <div className="notice notice-error">{error}</div> : null}
    {loading ? <section className="card">טוען נתוני חיוב...</section> : null}

    {!loading && context && account ? <>
      {needsAttention ? <div className="notice notice-error" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={20} />
            <div>
              <b>נדרשת פעולה בחשבון החיוב</b>
              <div style={{ marginTop: 4 }}>
                {account.status === 4
                  ? "חשבון החיוב מושהה בעקבות תשלום שלא הוסדר."
                  : account.status === 3
                    ? "קיים תשלום שלא הושלם במועד."
                    : account.paymentMethodStatus !== 3
                      ? "אין כרגע אמצעי תשלום פעיל בחשבון."
                      : latestPayment?.failureMessage || "ניסיון החיוב האחרון לא הושלם."}
              </div>
            </div>
          </div>
          {context.canManageBilling
            ? <Link className="btn btn-primary" href={settingsHref}>לתיקון פרטי החיוב</Link>
            : <span style={{ color: "var(--muted)", fontSize: 13 }}>יש לפנות למנהל החשבון כדי לעדכן את אמצעי התשלום.</span>}
        </div>
      </div> : null}

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-top"><span>סטטוס חשבון</span></div>
          <div className="stat-value" style={{ fontSize: 22 }}>{accountStatusLabel(account.status)}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {account.status === 2 ? "החשבון פעיל לחיובים" : "בדקו את פרטי החיוב"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>מי מחויב</span></div>
          <div className="stat-value" style={{ fontSize: 22 }}>{context.billedThroughName || "—"}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {context.source === "Organization" ? "חיוב דרך הארגון" : "חיוב עצמאי של המעסיק"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>אמצעי תשלום</span></div>
          <div className="stat-value" style={{ fontSize: 18 }}>{cardSummary(account)}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {account.paymentMethodStatus === 3 ? "פעיל" : "לא פעיל"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top"><span>חיוב אחרון</span></div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {latest ? money(latest.total, latest.currency) : "—"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            {latest ? periodStatusLabel(latest.status) : "עדיין אין תקופת חיוב"}
          </div>
        </div>
      </section>

      {latest ? <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div>
            <h2>תקופת החיוב האחרונה</h2>
            <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>{date(latest.periodStart)}–{date(latest.periodEnd)}</p>
          </div>
          <span className={String(latest.status) === "4" || String(latest.status) === "Charged" ? "badge badge-green" : "badge badge-gray"}>
            {periodStatusLabel(latest.status)}
          </span>
        </div>

        {lines.length ? <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 20 }}>
            {lines.map((line) => <div className="stat-card" key={String(line.metric)}>
              <div className="stat-top"><span>{metricLabels[String(line.metric)] ?? String(line.metric)}</span></div>
              <div className="stat-value">{line.quantity.toLocaleString("he-IL")}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {line.includedQuantity > 0 ? `${line.includedQuantity.toLocaleString("he-IL")} כלולים · ` : ""}
                {line.billableQuantity.toLocaleString("he-IL")} לחיוב
              </div>
            </div>)}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {lines.map((line) => <div key={`amount-${String(line.metric)}`} style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingBlock: 7, borderBottom: "1px solid var(--line)" }}>
              <span>{metricLabels[String(line.metric)] ?? String(line.metric)}</span>
              <span>
                {line.billableQuantity > 0 && line.unitPrice > 0
                  ? `${line.billableQuantity.toLocaleString("he-IL")} × ${money(line.unitPrice, latest.currency)} · `
                  : ""}
                <b>{money(line.amount, latest.currency)}</b>
              </span>
            </div>)}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, paddingTop: 8 }}>
              <b>סה״כ לתשלום</b><b>{money(latest.total, latest.currency)}</b>
            </div>
          </div>
        </> : <div className="empty">אין פירוט שימוש לתקופה הזו.</div>}
      </section> : <div className="empty" style={{ marginBottom: 18 }}>
        <ReceiptText size={34} />
        <b style={{ display: "block", marginBottom: 6 }}>עדיין אין תקופות חיוב</b>
        <span>לאחר סיום תקופת החיוב הראשונה יופיע כאן פירוט מלא.</span>
      </div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>היסטוריית תקופות</h2></div>
        {periods.length ? <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["תקופה", "סטטוס", "סכום", "חושב", "שולם"].map((item) =>
                <th key={item} style={{ textAlign: "right", padding: 12, borderBottom: "1px solid var(--line)" }}>{item}</th>)}
              </tr>
            </thead>
            <tbody>{periods.map((period) => <tr key={period.id}>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{date(period.periodStart)}–{date(period.periodEnd)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{periodStatusLabel(period.status)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}><b>{money(period.total, period.currency)}</b></td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{period.calculatedAt ? date(period.calculatedAt) : "—"}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{period.chargedAt ? date(period.chargedAt) : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="empty">אין עדיין תקופות חיוב.</div>}
      </section>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>היסטוריית תשלומים</h2>
            <span style={{ color: "var(--muted)" }}>ניסיונות חיוב שהפכו לרשומת תשלום במערכת.</span>
          </div>
          {payments.some((payment) => String(payment.status) === "3" || String(payment.status) === "Succeeded")
            ? <CheckCircle2 size={22} />
            : <Landmark size={22} />}
        </div>

        {payments.length ? <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["תאריך", "סכום", "סטטוס", "ספק", "אסמכתא"].map((item) =>
                <th key={item} style={{ textAlign: "right", padding: 12, borderBottom: "1px solid var(--line)" }}>{item}</th>)}
              </tr>
            </thead>
            <tbody>{payments.map((payment) => <tr key={payment.id}>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{date(payment.createdAt)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}><b>{money(payment.amount, payment.currency)}</b></td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
                {paymentStatusLabel(payment.status)}
                {payment.failureMessage ? <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 3 }}>{payment.failureMessage}</div> : null}
              </td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{payment.provider || "—"}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
                {payment.invoiceReference || payment.providerTransactionId || "—"}
              </td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="empty">אין עדיין תשלומים.</div>}
      </section>
    </> : null}
  </AppShell>;
}
