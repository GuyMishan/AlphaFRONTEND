"use client";

import { UiInput } from "@/components/ui/ui-controls";
import { useEffect, useMemo, useState } from "react";
import { FileText, Pencil, Search } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { notify } from "@/components/ui/notifications";
import { employersApi } from "@/features/employers/api";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import { employerInterfaceApi } from "@/features/reporting/employer-interface-api";
import { manualDepositsApi, type ManualDepositContributionLimit, type ManualDepositRow } from "@/features/reporting/deposits-api";
import { paymentConfirmationsApi, type PaymentConfirmation } from "@/features/reporting/payment-confirmations-api";
import type { Employer } from "@/features/employers/types";
import { formatDateDDMMYYYY } from "@/lib/format/date";
import { productNames, shortError, formatEmployerAccount } from "@/features/reporting/deposit-helpers";
import { DepositPaymentEditor } from "@/features/reporting/components/deposit-payment-editor";
import { LoadingState } from "@/components/loading/loading-state";
import { TableSkeleton } from "@/components/loading/skeleton";
import { errorMessage } from "@/lib/api/error-messages";

const receiptTypeFallback: Record<number, string> = {
  1: "שוטף", 2: "חד־פעמי", 4: "הפרשים",
  6: "השלמת פיצויים עד השכר המבוטח כפול הוותק",
  8: "הפקדה לפיצויים מעל השכר המבוטח כפול הוותק",
};
export function ManualDepositData({ organizationId, employerId, reportId, focusReportProductId = "", embeddedEditor = false, footerTargetId }: { organizationId: string; employerId: string; reportId: string; focusReportProductId?: string; embeddedEditor?: boolean; footerTargetId?: string }) {
  const [rows, setRows] = useState<ManualDepositRow[]>([]);
  const [contributionLimits, setContributionLimits] = useState<ManualDepositContributionLimit[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualDepositRow | null>(null);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [paymentAccount, setPaymentAccount] = useState<{ bankId: number; branchId: number; maskedAccountNumber: string } | null>(null);
  const [receiptLabels, setReceiptLabels] = useState<Record<number, string>>(receiptTypeFallback);
  const [proofs, setProofs] = useState<Record<string, PaymentConfirmation[]>>({});
  const [downloadingEvidence, setDownloadingEvidence] = useState<string | null>(null);

  async function load(search = query) {
    setLoading(true); setError("");
    try {
      const page = await manualDepositsApi.list(
        organizationId, employerId, reportId, search.trim(), 0, 100,
        focusReportProductId && !search.trim() ? focusReportProductId : "",
      );
      setRows(page.items);
      setContributionLimits(page.contributionLimits ?? []);
      if (focusReportProductId && !editing) {
        const focused = page.items.find((item) => item.id === focusReportProductId);
        if (focused) setEditing(focused);
      }
    }
    catch (err) { const message = shortError(errorMessage(err, "טעינת נתוני ההפקדות נכשלה")); setError(message); notify.error(message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setQuery("");
    void load("");
    employersApi.employer(organizationId, employerId).then(setEmployer).catch(() => setEmployer(null));
    employerInterfaceApi.options("receipt-type").then((items) => {
      setReceiptLabels((previous) => Object.fromEntries([
        ...Object.entries(previous).map(([code, label]) => [Number(code), label] as const),
        ...items.filter((item) => item.name && !/^קוד\s+\d+$/.test(item.name))
          .map((item) => [item.code, item.name] as const),
      ]));
    }).catch(() => { /* authoritative labels remain available as local offline fallback */ });
    paymentAccountsApi.employerPaymentResolution(organizationId, employerId).then((resolution) => {
      const account = resolution.account;
      setPaymentAccount(account ? { bankId: account.bankId, branchId: account.branchId, maskedAccountNumber: account.maskedAccountNumber } : null);
    }).catch(() => setPaymentAccount(null));
    paymentConfirmationsApi.listForReport(organizationId, employerId, reportId)
      .then((items) => setProofs(items.reduce<Record<string, PaymentConfirmation[]>>((groups, item) => {
        (groups[item.reportProductId] ??= []).push(item);
        return groups;
      }, {})))
      .catch(() => setProofs({}));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the report or focused product changes; load reads the current props
  }, [organizationId, employerId, reportId, focusReportProductId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), 300);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced search: rerun on query changes only
  }, [query]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalDeposit || 0), 0), [rows]);
  async function downloadProof(productId: string, item: PaymentConfirmation) {
    setDownloadingEvidence(item.id);
    try { await paymentConfirmationsApi.download(organizationId, employerId, reportId, productId, item); }
    catch { notify.error("הורדת האסמכתא נכשלה."); }
    finally { setDownloadingEvidence(null); }
  }

  // Resolution mode edits one concrete product, not the entire deposit list.
  // Reuse the same DepositPaymentEditor as the normal deposit edit modal.
  if (embeddedEditor && focusReportProductId) return <>
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {loading ? <LoadingState label="טוען את ההפקדה לעריכה..." /> : !editing ? <div className="empty" role="status">
      לא נמצאה ההפקדה שנבחרה בסביבת התיקון.
    </div> : <DepositPaymentEditor embedded footerTargetId={footerTargetId}
      employer={employer} organizationId={organizationId} employerId={employerId}
      reportId={reportId} row={editing} contributionLimits={contributionLimits}
      onEvidenceChanged={(items) => setProofs(current => ({ ...current, [editing.id]: items }))}
      onClose={() => setEditing(null)}
      onSaved={(updated) => {
        setRows(current => current.map(item => item.id === updated.id ? updated : item));
        setEditing(updated);
        notify.success("פרטי התשלום נשמרו בהצלחה");
      }} />}
  </>;

  return <>
    <div className="card-head deposit-head">
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--color-text-muted)" }}>פרטי התשלום ברמת המוצר.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} תוצאות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><UiInput maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="יצרן, מוצר, עובד או אסמכתא" /></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <TableSkeleton columns={6} label="טוען נתוני הפקדות..." /> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות בדיווח</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד לדיווח הנוכחי.</span></div> : <DataTable
      items={rows}
      rowKey={(row) => row.id}
      rowHeight={56}
      maxHeight={560}
      minTableWidth={1080}
      columns={[
        { key: "employee", label: "עובד", width: "11%" },
        { key: "provider", label: "שם יצרן / מוצר", width: "17%" },
        { key: "providerAccount", label: "חשבון יצרן", width: "9%" },
        { key: "amount", label: "סכום", width: "8%" },
        { key: "employerAccount", label: "חשבון מעסיק", width: "11%" },
        { key: "reference", label: "אסמכתא", width: "8%" },
        { key: "date", label: "תאריך ערך", width: "8%" },
        { key: "type", label: "סוג תקבול", width: "10%" },
        { key: "status", label: "סטטוס", width: "7%" },
        { key: "files", label: "קבצים", width: "5%" },
        { key: "edit", label: "", width: "6%" },
      ]}
      renderCells={(row) => [
        <b key="cell-135">{row.employeeName}</b>,
        <span key="cell-136" title={[row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "מוצר פנסיוני", row.policyNumber || ""].filter(Boolean).join(" · ")}>{row.providerName || row.fundCompanyName || row.fundName || productNames[row.productType] || "מוצר פנסיוני"}</span>,
        <span key="cell-137" className="account-number">{row.providerAccount || "—"}</span>,
        `₪${Number(row.totalDeposit).toLocaleString("he-IL")}`,
        <span key="cell-139" className="account-number">{formatEmployerAccount(row, paymentAccount)}</span>,
        row.referenceNumber || "—",
        row.valueDate ? formatDate(row.valueDate) : "—",
        row.reportingType ? (receiptLabels[Number(row.reportingType)] ?? `סוג תקבול לא מוכר (${row.reportingType})`) : "—",
        <span key="cell-143" className={`badge ${row.requiresCompletion ? "badge-orange" : "badge-green"}`}>{row.requiresCompletion ? "דורש השלמה" : "מוכן"}</span>,
        proofs[row.id]?.length
          ? <button type="button" className="icon-button deposit-proof-icon"
              title={`הורדת ${proofs[row.id][0].originalFileName}`}
              aria-label={`הורדת ${proofs[row.id][0].originalFileName}`}
              disabled={downloadingEvidence === proofs[row.id][0].id}
              onClick={() => void downloadProof(row.id, proofs[row.id][0])}>
              <FileText size={17} />
            </button>
          : <span className="deposit-proof-empty">-</span>,
        <button key="cell-153" className="icon-button deposit-edit-icon" aria-label="עריכת פרטי תשלום" onClick={() => setEditing(row)}><Pencil size={17} /></button>,
      ]}
    />}
    {editing ? <DepositPaymentEditor embedded={embeddedEditor} footerTargetId={footerTargetId} employer={employer} organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing} contributionLimits={contributionLimits}
      onEvidenceChanged={(items) => setProofs((current) => ({ ...current, [editing.id]: items }))}
      onClose={() => setEditing(null)} onSaved={(updated) => {
      setRows((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
      notify.success("פרטי התשלום נשמרו בהצלחה");
    }} /> : null}
  </>;
}

function formatDate(value: string) {
  return formatDateDDMMYYYY(value, value);
}