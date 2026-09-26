"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CreditCard, ReceiptText, RefreshCw, RotateCcw, Save, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
import { UiInput, UiSelect } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type {
  BillingAccountPricingType,
  BillingCustomerRow,
  BillingMonthlySummaryRow,
  BillingPayment,
  BillingRefund,
} from "@/lib/types";
import { formatDateDDMMYYYY } from "@/lib/date-format";

type Tab = "subscriptions" | "summary" | "payments" | "refunds";

const tabs = [
  { key: "subscriptions", label: "מנויים", icon: UsersRound },
  { key: "summary", label: "סיכום חודשי", icon: ReceiptText },
  { key: "payments", label: "תשלומים", icon: CreditCard },
  { key: "refunds", label: "זיכויים", icon: RotateCcw },
] satisfies Array<{ key: Tab; label: string; icon: typeof CreditCard }>;

const customerBillingTypeOptions = [
  { value: "Free", label: "חינם" },
  { value: "PerEmployee", label: "תשלום פר עובד" },
  { value: "PerReportRow", label: "תשלום פר שורה" },
];

const allMonthsOption = [{ value: "all", label: "כל החודשים" }];
const allOrganizationsOption = [{ value: "all", label: "כל הארגונים" }];
const allEmployersOption = [{ value: "all", label: "כל המעסיקים" }];

function money(value: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
}

function shortDate(value: string) {
  return formatDateDDMMYYYY(value, "—");
}

function billingLabel(type: BillingAccountPricingType, unitPrice: number, currency = "ILS") {
  if (type === "PerEmployee") return `${money(unitPrice, currency)} לעובד`;
  if (type === "PerReportRow") return `${money(unitPrice, currency)} לשורה`;
  return "חינם";
}

function paymentStatus(status: string | number | null) {
  if (status === null) return "לא חויב";
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
  } as Record<string, string>)[String(status)] ?? String(status);
}

function refundStatus(status: string | number) {
  return ({
    "1": "ממתין",
    "2": "בוצע",
    "3": "נכשל",
    Pending: "ממתין",
    Succeeded: "בוצע",
    Failed: "נכשל",
  } as Record<string, string>)[String(status)] ?? String(status);
}

function paymentMethodLabel(row: Pick<BillingCustomerRow, "paymentMethodStatus" | "cardBrand" | "cardLast4">) {
  const active = ["3", "Active"].includes(String(row.paymentMethodStatus));
  if (!active) return "לא מוגדר";
  if (row.cardLast4) return `${row.cardBrand || "כרטיס"} •••• ${row.cardLast4}`;
  return "מוגדר";
}

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [customers, setCustomers] = useState<BillingCustomerRow[]>([]);
  const [summary, setSummary] = useState<BillingMonthlySummaryRow[]>([]);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [employerFilter, setEmployerFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [pricingCustomer, setPricingCustomer] = useState<BillingCustomerRow | null>(null);
  const [customerBillingType, setCustomerBillingType] = useState<BillingAccountPricingType>("Free");
  const [customerUnitPrice, setCustomerUnitPrice] = useState("0");
  const [refundPayment, setRefundPayment] = useState<BillingPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [customerRows, summaryRows, paymentRows, refundRows] = await Promise.all([
        alphaApi.billingCustomers(),
        alphaApi.platformBillingSummary(),
        alphaApi.platformBillingPayments(),
        alphaApi.platformBillingRefunds(),
      ]);
      setCustomers(customerRows);
      setSummary(summaryRows);
      setPayments(paymentRows);
      setRefunds(refundRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת נתוני החיוב נכשלה.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getSession()?.platformAdmin) return;
    void load();
  }, []);

  function openPricing(customer: BillingCustomerRow) {
    setPricingCustomer(customer);
    setCustomerBillingType(customer.billingType);
    setCustomerUnitPrice(String(customer.unitPrice ?? 0));
    setError("");
  }

  async function savePricing() {
    if (!pricingCustomer) return;

    const unitPrice = customerBillingType === "Free" ? 0 : Number(customerUnitPrice);
    if (customerBillingType !== "Free" && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
      setError("יש להזין מחיר גדול מאפס.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await alphaApi.updateBillingCustomerPricing({
        payerType: pricingCustomer.payerType,
        payerId: pricingCustomer.payerId,
        billingType: customerBillingType,
        unitPrice,
      });
      setPricingCustomer(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת התעריף נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function chargeSummaryRow(row: BillingMonthlySummaryRow) {
    setSaving(true);
    setError("");
    try {
      await alphaApi.runBillingPeriod(row.billingAccountId, {
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        charge: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "החיוב נכשל.");
    } finally {
      setSaving(false);
    }
  }

  async function testCharge(customer: BillingCustomerRow) {
    if (!customer.billingAccountId) {
      setError("ללקוח עדיין אין חשבון חיוב פעיל.");
      return;
    }

    if (!window.confirm("לבצע חיוב בדיקה של ₪1 באמצעי התשלום המחובר?")) return;

    setSaving(true);
    setError("");
    try {
      await alphaApi.testBillingCharge(customer.billingAccountId, 1);
      window.alert("חיוב הבדיקה של ₪1 עבר בהצלחה.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "חיוב הבדיקה נכשל.");
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

  const organizationOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of customers) seen.set(row.organizationId, row.organizationName);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], "he"));
  }, [customers]);

  const employerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of customers) {
      if (!row.employerId || !row.employerName) continue;
      if (organizationFilter !== "all" && row.organizationId !== organizationFilter) continue;
      seen.set(row.employerId, row.employerName);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], "he"));
  }, [customers, organizationFilter]);

  const visibleCustomers = useMemo(
    () => customers.filter((row) => {
      if (organizationFilter !== "all" && row.organizationId !== organizationFilter) return false;
      if (employerFilter !== "all" && row.employerId !== employerFilter) return false;
      return true;
    }),
    [customers, organizationFilter, employerFilter],
  );

  const months = useMemo(
    () => Array.from(new Set(summary.map((row) => row.month))).sort().reverse(),
    [summary],
  );

  const visibleSummary = useMemo(
    () => summary.filter((row) => {
      if (organizationFilter !== "all" && row.organizationId !== organizationFilter) return false;
      if (employerFilter !== "all" && row.employerId !== employerFilter) return false;
      if (monthFilter !== "all" && row.month !== monthFilter) return false;
      return true;
    }),
    [summary, organizationFilter, employerFilter, monthFilter],
  );

  const totals = useMemo(() => ({
    billed: visibleSummary.reduce((sum, row) => sum + row.amount, 0),
    paid: visibleSummary.filter((row) => row.paid).reduce((sum, row) => sum + row.amount, 0),
    open: visibleSummary.filter((row) => !row.paid).reduce((sum, row) => sum + row.amount, 0),
  }), [visibleSummary]);

  if (!getSession()?.platformAdmin) {
    return <AppShell title="ניהול גבייה ותמחור" hideScopeController>
      <div className="notice notice-error">אין הרשאת Platform Admin למסך זה.</div>
    </AppShell>;
  }

  return <AppShell title="חיובים" hideScopeController>
    <div className="page-head">
      <div>
        <h1>ניהול גבייה ותמחור</h1>
        <p>ניהול מסלול ותעריף לכל ארגון או מעסיק, ומעקב אחר הגבייה בפועל.</p>
      </div>
      <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
        <RefreshCw size={16} />רענון
      </button>
    </div>

    <AppTabs items={tabs} activeKey={tab} onChange={setTab} ariaLabel="ניהול גבייה ותמחור" />
    {error ? <div className="notice notice-error" style={{ margin: "16px 0" }}>{error}</div> : null}

    {tab === "subscriptions" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head">
        <div>
          <h2>מנויים</h2>
          <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>
            לכל ארגון או מעסיק מוגדר מסלול אחד: חינם, פר עובד או פר שורה — והתעריף שלו.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="field" style={{ minWidth: 220 }}>
            <span>ארגון</span>
            <UiSelect value={organizationFilter} onChange={(event) => {
              setOrganizationFilter(event.target.value);
              setEmployerFilter("all");
            }}>
              {allOrganizationsOption.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {organizationOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
          </label>
          <label className="field" style={{ minWidth: 220 }}>
            <span>מעסיק</span>
            <UiSelect value={employerFilter} onChange={(event) => setEmployerFilter(event.target.value)}>
              {allEmployersOption.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {employerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
          </label>
        </div>
      </div>

      {visibleCustomers.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["ארגון", "מעסיק", "מסלול", "תעריף", "אמצעי תשלום", "פעולות"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
        <tbody>{visibleCustomers.map((row) => {
          const href = row.payerType === "Organization"
            ? `/organizations/${row.organizationId}`
            : row.employerId ? `/employers/${row.employerId}` : null;
          return <tr key={`${row.payerType}:${row.payerId}`}>
            <td style={td}><b>{row.organizationName || "—"}</b></td>
            <td style={td}>{row.payerType === "Employer" ? (row.employerName || row.payerName) : "כל הארגון"}</td>
            <td style={td}>{row.billingType === "Free" ? "חינם" : row.billingType === "PerEmployee" ? "פר עובד" : "פר שורה"}</td>
            <td style={td}><b>{row.billingType === "Free" ? "—" : money(row.unitPrice)}</b></td>
            <td style={td}>{paymentMethodLabel(row)}</td>
            <td style={td}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary" type="button" onClick={() => openPricing(row)}>עריכת מסלול ותעריף</button>
                {row.billingAccountId && ["3", "Active"].includes(String(row.paymentMethodStatus))
                  ? <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => void testCharge(row)}>חיוב בדיקה ₪1</button>
                  : null}
                {href ? <Link className="btn btn-secondary" href={href}>כרטיס לקוח</Link> : null}
              </div>
            </td>
          </tr>;
        })}</tbody>
      </table> : <div className="empty">אין לקוחות להצגה.</div>}
    </section> : null}

    {tab === "summary" ? <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <section className="grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
        <div className="card"><div style={{ color: "var(--muted)", fontSize: 13 }}>סה״כ לחיוב</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{money(totals.billed)}</div></div>
        <div className="card"><div style={{ color: "var(--muted)", fontSize: 13 }}>שולם</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{money(totals.paid)}</div></div>
        <div className="card"><div style={{ color: "var(--muted)", fontSize: 13 }}>פתוח</div><div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{money(totals.open)}</div></div>
      </section>

      <section className="card" style={{ overflowX: "auto" }}>
        <div className="card-head">
          <div><h2>סיכום חודשי</h2></div>
          <div style={{ display: "flex", gap: 10 }}>
            <UiSelect value={organizationFilter} onChange={(event) => {
              setOrganizationFilter(event.target.value);
              setEmployerFilter("all");
            }}>
              {allOrganizationsOption.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {organizationOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
            <UiSelect value={employerFilter} onChange={(event) => setEmployerFilter(event.target.value)}>
              {allEmployersOption.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {employerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </UiSelect>
            <UiSelect value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              {allMonthsOption.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              {months.map((month) => <option key={month} value={month}>{month}</option>)}
            </UiSelect>
          </div>
        </div>

        {visibleSummary.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["חודש", "לקוח", "חיוב", "סכום", "תשלום", "שולם בתאריך", "פעולות"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
          <tbody>{visibleSummary.map((row) => <tr key={row.id}>
            <td style={td}>{row.month}</td>
            <td style={td}><b>{row.payerName}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{row.payerType === "Organization" ? "ארגון" : "מעסיק"}</div></td>
            <td style={td}>{billingLabel(row.billingType, row.unitPrice, row.currency)}</td>
            <td style={td}><b>{money(row.amount, row.currency)}</b></td>
            <td style={td}>{row.paid ? "שולם" : paymentStatus(row.paymentStatus)}{row.failureMessage ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.failureMessage}</div> : null}</td>
            <td style={td}>{row.paidAt ? shortDate(row.paidAt) : "—"}</td>
            <td style={td}>{!row.paid && row.amount > 0
              ? <button className="btn btn-primary" disabled={saving} onClick={() => void chargeSummaryRow(row)}>נסה לחייב</button>
              : "—"}</td>
          </tr>)}</tbody>
        </table> : <div className="empty">אין חיובים להצגה.</div>}
      </section>
    </div> : null}

    {tab === "payments" ? <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
      <section className="card" style={{ overflowX: "auto" }}>
        <div className="card-head"><h2>תשלומים</h2></div>
        {payments.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["תאריך", "סטטוס", "סכום", "ספק", "עסקה", "פעולות"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
          <tbody>{payments.map((row) => {
            const refunded = refundedByPayment.get(row.id) ?? 0;
            const remaining = Math.max(0, row.amount - refunded);
            return <tr key={row.id}>
              <td style={td}>{shortDate(row.createdAt)}</td>
              <td style={td}>{paymentStatus(row.status)}{row.failureMessage ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.failureMessage}</div> : null}</td>
              <td style={td}><b>{money(row.amount, row.currency)}</b></td>
              <td style={td}>{row.provider || "—"}</td>
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
    </div> : null}

    {tab === "refunds" ? <section className="card" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="card-head"><h2>זיכויים</h2></div>
      {refunds.length ? <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["תאריך", "סכום", "סטטוס", "סיבה", "מזהה ספק"].map((item) => <th key={item} style={th}>{item}</th>)}</tr></thead>
        <tbody>{refunds.map((row) => <tr key={row.id}>
          <td style={td}>{shortDate(row.createdAt)}</td>
          <td style={td}><b>{money(row.amount)}</b></td>
          <td style={td}>{refundStatus(row.status)}{row.errorMessage ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.errorMessage}</div> : null}</td>
          <td style={td}>{row.reason || "—"}</td>
          <td style={td}>{row.providerRefundId || "—"}</td>
        </tr>)}</tbody>
      </table> : <div className="empty">אין זיכויים.</div>}
    </section> : null}

    {pricingCustomer ? <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setPricingCustomer(null);
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,.48)", display: "grid", placeItems: "center", padding: 20 }}
    >
      <section role="dialog" aria-modal="true" aria-label="עריכת חיוב לקוח" className="card" style={{ width: "min(540px,96vw)", minHeight: 401, padding: 26, display: "flex", flexDirection: "column" }}>
        <div className="card-head">
          <div>
            <h2>עריכת מסלול ותעריף · {pricingCustomer.payerName}</h2>
            <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>בחר מסלול והגדר את התעריף של הלקוח.</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => setPricingCustomer(null)}>סגירה</button>
        </div>

        <div className="grid" style={{ gap: 14 }}>
          <label className="field">
            <span>מסלול</span>
            <UiSelect value={customerBillingType} onChange={(event) => setCustomerBillingType(event.target.value as BillingAccountPricingType)}>
              {customerBillingTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </label>
          {customerBillingType !== "Free" ? <label className="field">
            <span>{customerBillingType === "PerEmployee" ? "מחיר לעובד" : "מחיר לשורה"}</span>
            <UiInput type="number" min={0.01} step="0.01" value={customerUnitPrice} onChange={(event) => setCustomerUnitPrice(event.target.value)} />
          </label> : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: "auto", paddingTop: 28 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setPricingCustomer(null)}>ביטול</button>
          <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void savePricing()}>
            <Save size={16} />{saving ? "שומר..." : "שמירה"}
          </button>
        </div>
      </section>
    </div> : null}

    {refundPayment ? <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setRefundPayment(null);
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,.48)", display: "grid", placeItems: "center", padding: 20 }}
    >
      <section role="dialog" aria-modal="true" aria-label="זיכוי תשלום" className="card" style={{ width: "min(500px,96vw)", padding: 22 }}>
        <div className="card-head"><h2>זיכוי תשלום</h2></div>
        <div className="grid" style={{ gap: 14 }}>
          <label className="field"><span>סכום</span><UiInput type="number" min={0.01} step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></label>
          <label className="field"><span>סיבה</span><UiInput value={refundReason} onChange={(event) => setRefundReason(event.target.value)} /></label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setRefundPayment(null)}>ביטול</button>
          <button className="btn btn-primary" onClick={() => void refund()} disabled={saving}>בצע זיכוי</button>
        </div>
      </section>
    </div> : null}
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
