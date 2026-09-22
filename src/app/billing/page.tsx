"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection, getOrganizationSelection } from "@/lib/session";
import type { BillingCalculationLine, BillingPeriod } from "@/lib/types";

const metricLabels: Record<string, string> = {
  "1": "מחיר בסיס", "2": "מעסיקים", "3": "עובדים", "4": "שורות דיווח", "5": "תיקונים",
  Base: "מחיר בסיס", Employer: "מעסיקים", Employee: "עובדים", ReportRow: "שורות דיווח", Correction: "תיקונים",
};

function money(value: number, currency = "ILS") {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency }).format(value);
}

function date(value: string) {
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" }).format(new Date(value));
}

function statusLabel(status: string | number) {
  const value = String(status);
  return ({ "1": "פתוחה", "2": "חושבה", "3": "בתהליך חיוב", "4": "שולמה", "5": "באיחור", "6": "מושהית", "7": "בוטלה",
    Open: "פתוחה", Calculated: "חושבה", Charging: "בתהליך חיוב", Charged: "שולמה", PastDue: "באיחור", Suspended: "מושהית", Cancelled: "בוטלה" } as Record<string, string>)[value] ?? value;
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

export default function BillingPage() {
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState<{ organizationId: string; employerId?: string } | null>(null);

  useEffect(() => {
    const organizationId = getOrganizationSelection();
    const employer = getEmployerSelection();
    if (!organizationId) {
      setError("יש לבחור ארגון כדי לצפות בחיובים.");
      setLoading(false);
      return;
    }
    const selected = employer?.organizationId === organizationId
      ? { organizationId, employerId: employer.employerId }
      : { organizationId };
    setContext(selected);

    const request = selected.employerId
      ? alphaApi.employerBillingPeriods(selected.organizationId, selected.employerId)
      : alphaApi.organizationBillingPeriods(selected.organizationId);
    request.then(setPeriods).catch((err) => {
      setError(err instanceof Error ? err.message : "טעינת החיובים נכשלה.");
    }).finally(() => setLoading(false));
  }, []);

  const latest = periods[0] ?? null;
  const lines = useMemo(() => latest ? snapshotLines(latest) : [], [latest]);

  const settingsHref = context
    ? context.employerId
      ? "/employers/" + context.employerId + "?organizationId=" + context.organizationId
      : "/organizations/" + context.organizationId
    : "/settings";

  return <AppShell title="חיובים">
    <div className="page-head">
      <div>
        <h1>חיובים</h1>
        <p>פירוט תקופות החיוב, השימוש והסכומים שחושבו עבורכם.</p>
      </div>
      {context ? <Link className="btn btn-secondary" href={settingsHref}>
        <CreditCard size={16} />פרטי חיוב ואמצעי תשלום
      </Link> : null}
    </div>

    {error ? <div className="notice notice-error">{error}</div> : null}
    {loading ? <section className="card">טוען חיובים...</section> : null}

    {!loading && !latest && !error ? <div className="empty">
      <ReceiptText size={34} />
      <b style={{ display: "block", marginBottom: 6 }}>עדיין אין תקופות חיוב</b>
      <span>לאחר סיום תקופת החיוב הראשונה יופיע כאן פירוט מלא.</span>
    </div> : null}

    {latest ? <>
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div>
            <h2>תקופת החיוב האחרונה</h2>
            <p style={{ color: "var(--muted)", margin: "5px 0 0" }}>{date(latest.periodStart)}–{date(latest.periodEnd)}</p>
          </div>
          <span className="badge badge-blue">{statusLabel(latest.status)}</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 20 }}>
          {lines.map((line) => <div className="stat-card" key={String(line.metric)}>
            <div className="stat-top"><span>{metricLabels[String(line.metric)] ?? String(line.metric)}</span></div>
            <div className="stat-value">{line.quantity.toLocaleString("he-IL")}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {line.includedQuantity > 0 ? line.includedQuantity.toLocaleString("he-IL") + " כלולים · " : ""}
              {line.billableQuantity.toLocaleString("he-IL")} לחיוב
            </div>
          </div>)}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {lines.map((line) => <div key={"amount-" + String(line.metric)} style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingBlock: 7, borderBottom: "1px solid var(--line)" }}>
            <span>{metricLabels[String(line.metric)] ?? String(line.metric)}</span>
            <b>{money(line.amount, latest.currency)}</b>
          </div>)}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, paddingTop: 8 }}>
            <b>סה״כ לתשלום</b><b>{money(latest.total, latest.currency)}</b>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>היסטוריית חיובים</h2></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["תקופה", "סטטוס", "סכום", "חושב", "שולם"].map((x) => <th key={x} style={{ textAlign: "right", padding: 12, borderBottom: "1px solid var(--line)" }}>{x}</th>)}</tr></thead>
            <tbody>{periods.map((period) => <tr key={period.id}>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{date(period.periodStart)}–{date(period.periodEnd)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{statusLabel(period.status)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}><b>{money(period.total, period.currency)}</b></td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{period.calculatedAt ? date(period.calculatedAt) : "—"}</td>
              <td style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>{period.chargedAt ? date(period.chargedAt) : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>
    </> : null}
  </AppShell>;
}
