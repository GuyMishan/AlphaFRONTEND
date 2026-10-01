"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, RefreshCw, Save } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { UiAutocomplete, UiTextarea } from "@/components/ui-controls";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";
import {
  reportFeedbackApi,
  type ReportFeedbackDepositDetails,
  type TreatmentStatusOption,
} from "@/lib/report-feedback-api";

function money(value: number | null | undefined) {
  return value == null ? "—" : `₪${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}

function percent(value: number | null | undefined) {
  return value == null ? "—" : `${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 2 })}%`;
}

function sameNumber(a: number | null | undefined, b: number | null | undefined) {
  if (a == null || b == null) return true;
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

function contributionTypeLabel(code: number | null | undefined) {
  switch (code) {
    case 1: return "פיצויים";
    case 2: return "תגמולי עובד";
    case 3: return "תגמולי מעביד";
    case 4: return "תגמולים 47";
    case 5: return "אכ״ע עובד";
    case 6: return "אכ״ע מעסיק";
    case 7: return "רכיב עובד נוסף";
    case 8: return "רכיב מעסיק נוסף";
    default: return "רכיב יצרן";
  }
}

export function ReportDepositFeedbackModal({
  organizationId,
  employerId,
  reportId,
  reportProductId,
  onClose,
  onTreatmentSaved,
  onEditDeposit,
  onStartCorrection,
}: {
  organizationId: string;
  employerId: string;
  reportId: string;
  reportProductId: string;
  onClose: () => void;
  onTreatmentSaved: () => void;
  onEditDeposit?: (details: ReportFeedbackDepositDetails) => void;
  onStartCorrection?: (details: ReportFeedbackDepositDetails) => void;
}) {
  const [details, setDetails] = useState<ReportFeedbackDepositDetails | null>(null);
  const [statuses, setStatuses] = useState<TreatmentStatusOption[]>([]);
  const [statusText, setStatusText] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextDetails, nextStatuses] = await Promise.all([
        reportFeedbackApi.depositDetails(organizationId, employerId, reportId, reportProductId),
        reportFeedbackApi.treatmentStatuses(organizationId, employerId),
      ]);
      setDetails(nextDetails);
      setStatuses(nextStatuses);
      setStatusText(nextDetails.treatment?.label ?? "");
      setNote(nextDetails.treatment?.note ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת פרטי המשוב נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId, employerId, reportId, reportProductId]);

  const statusOptions = useMemo(() => {
    const query = statusText.trim();
    const source = !query || statuses.some((item) => item.label === query)
      ? statuses
      : statuses.filter((item) => item.label.includes(query));
    return source.map((item) => ({ value: item.code, label: item.label }));
  }, [statuses, statusText]);

  async function saveTreatment() {
    const selected = statuses.find((item) => item.label === statusText);
    if (!selected) {
      setError("יש לבחור סטטוס טיפול מהרשימה.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await reportFeedbackApi.updateTreatment(
        organizationId, employerId, reportId, reportProductId, selected.code, note,
      );
      await load();
      onTreatmentSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת סטטוס הטיפול נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal"
    title={details ? `פירוט הפקדה ומשוב · ${details.employee.name}` : "פירוט הפקדה ומשוב"}
    subtitle={details ? [details.product.fundCompanyName, details.product.fundName, details.product.policyNumber ? `פוליסה ${details.product.policyNumber}` : ""].filter(Boolean).join(" · ") : ""}
    onClose={onClose}
    closeDisabled={saving}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>סגירה</button>
      {details?.report.canEdit && onEditDeposit
        ? <button type="button" className="btn btn-secondary" data-modal-side="positive" onClick={() => onEditDeposit(details)} disabled={saving}>
            <Pencil size={15} />עריכת פרטי ההפקדה
          </button>
        : null}
      {details?.canCreateCorrection && onStartCorrection
        ? <button type="button" className="btn btn-secondary" data-modal-side="positive" onClick={() => onStartCorrection(details)} disabled={saving}>
            <RefreshCw size={15} />יצירת דיווח מתקן
          </button>
        : null}
      {details?.canUpdateTreatment ? <button type="button" className="btn btn-primary" onClick={() => void saveTreatment()} disabled={saving || loading}>
        <Save size={15} />{saving ? "שומר..." : "שמירת טיפול"}
      </button> : null}
    </>}
  >
    {loading ? <div className="empty">טוען פרטי הפקדה ומשוב...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}
    {details ? <>
      <section className="feedback-modal-summary" aria-label="סיכום הפקדה">
        <div><span>עובד</span><b>{details.employee.name}</b><small>ת״ז {details.employee.nationalId}</small></div>
        <div><span>חודש שכר</span><b>{details.product.salaryMonth?.slice(0, 7).split("-").reverse().join("/")}</b></div>
        <div><span>שכר מבוטח</span><b>{money(details.product.salary)}</b></div>
        <div><span>סה״כ הפקדה</span><b>{money(details.product.totalAmount)}</b></div>
      </section>

      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3>דיווח מעסיק מול קליטת יצרן</h3><p>כל רכיב מוצג מול הנתונים שהוחזרו במשוב הרשמי. פערים מסומנים בלבד.</p></div>
        </div>
        <div className="contribution-comparison-list">
          {details.employerContributions.map((employer) => {
            const manufacturerRows = details.manufacturerContributions.filter((item) => item.contributionId === employer.id);
            const manufacturer = manufacturerRows.find((item) => item.contributionTypeCode === employer.contributionTypeCode)
              ?? manufacturerRows[0];
            const additionalManufacturerRows = manufacturerRows.filter((item) => item !== manufacturer);
            const amountMismatch = manufacturer?.contributionAmount != null && !sameNumber(employer.amount, manufacturer.contributionAmount);
            const rateMismatch = manufacturer?.contributionRate != null && !sameNumber(employer.percentage, manufacturer.contributionRate);
            const salaryMismatch = manufacturer?.calculatedSalary != null && !sameNumber(details.product.salary, manufacturer.calculatedSalary);
            const hasError = manufacturer?.errorCode != null && manufacturer.errorCode !== 1;
            const hasDifference = amountMismatch || rateMismatch || salaryMismatch || hasError;
            return <article className={`contribution-comparison-card${hasDifference ? " has-difference" : ""}`} key={employer.id}>
              <div className="contribution-comparison-title">
                <strong>{employer.label}</strong>
                {manufacturer
                  ? hasDifference
                    ? <span className="feedback-state attention"><AlertTriangle size={14} />נמצא פער</span>
                    : <span className="feedback-state completed"><CheckCircle2 size={14} />נקלט ללא פער</span>
                  : <span className="feedback-state pending">ממתין למשוב</span>}
              </div>
              <div className="contribution-sides">
                <div className="contribution-side employer">
                  <span className="contribution-side-label">מעסיק</span>
                  <div><small>סכום</small><b>{money(employer.amount)}</b></div>
                  <div><small>שיעור</small><b>{percent(employer.percentage)}</b></div>
                  <div><small>שכר</small><b>{money(details.product.salary)}</b></div>
                </div>
                <div className="contribution-compare-mark" aria-hidden="true">⇄</div>
                <div className="contribution-side manufacturer">
                  <span className="contribution-side-label">יצרן</span>
                  {manufacturer ? <>
                    <div className={amountMismatch ? "value-difference" : ""}><small>סכום</small><b>{money(manufacturer.contributionAmount)}</b></div>
                    <div className={rateMismatch ? "value-difference" : ""}><small>שיעור</small><b>{percent(manufacturer.contributionRate)}</b></div>
                    <div className={salaryMismatch ? "value-difference" : ""}><small>שכר מחושב</small><b>{money(manufacturer.calculatedSalary)}</b></div>
                  </> : <div className="manufacturer-pending">טרם התקבלו נתוני יצרן לרכיב זה.</div>}
                </div>
              </div>
              {manufacturer && (hasError || manufacturer.errorDescription)
                ? <div className={`contribution-feedback-message${hasError ? " error" : ""}`}>
                    {hasError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                    <span>{manufacturer.errorDescription || `קוד שגיאה ${manufacturer.errorCode}`}</span>
                  </div>
                : null}
              {manufacturer?.sourceFileName ? <small className="feedback-source">מקור: {manufacturer.sourceFileName} · {formatDateTimeDDMMYYYY(manufacturer.receivedAt, "—")}</small> : null}
              {additionalManufacturerRows.length ? <div className="manufacturer-extra-rows">
                <small>נתוני יצרן נוספים שהוחזרו לאותה רשומה</small>
                {additionalManufacturerRows.map((item) => <div key={`${item.recordIdentifier}:${item.sequence}`}>
                  <span>{contributionTypeLabel(item.contributionTypeCode)}</span>
                  <span>{money(item.contributionAmount)}</span>
                  <span>{percent(item.contributionRate)}</span>
                  <span>{money(item.calculatedSalary)}</span>
                </div>)}
              </div> : null}
            </article>;
          })}
          {details.employerContributions.length === 0 ? <div className="notice notice-info">לא נמצאו רכיבי הפרשה בהפקדה.</div> : null}
        </div>
      </section>

      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head"><div><h3>מצב כספים</h3><p>נתוני הכספים מוחזרים ברמת העברת הכספים ואינם זהים לסטטוס קליטת הרשומה.</p></div></div>
        {details.money ? <div className="money-feedback-grid">
          <div><span>דווח לקופה</span><b>{money(details.money.reportedDepositAmount)}</b></div>
          <div><span>נקלט בפועל</span><b>{money(details.money.actualReceivedAmount)}</b></div>
          <div><span>שויך לעובדים</span><b>{money(details.money.allocatedAmount)}</b></div>
          <div><span>במעבר</span><b>{money(details.money.inTransitAmount)}</b></div>
          <div><span>סטטוס טיפול בכספים</span><b>{details.money.moneyTreatmentStatus ?? "—"}</b></div>
          <div><span>אסמכתא</span><b dir="ltr">{details.money.paymentReference || details.payment?.referenceNumber || "—"}</b></div>
        </div> : <div className="notice notice-info">טרם התקבל משוב כספי עבור ההפקדה.</div>}
      </section>

      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head"><div><h3>טיפול במשוב</h3><p>{details.canUpdateTreatment
          ? "סטטוס הטיפול וההערה הם פנימיים ל־ALPHA ואינם משנים את המשוב הרשמי שהתקבל."
          : "ניתן לצפות בטיפול ובהיסטוריה, אך אין לך הרשאה לעדכן אותם."}</p></div></div>
        <div className="feedback-treatment-form">
          <label><span>סטטוס טיפול</span>
            <UiAutocomplete
              value={statusText}
              onValueChange={setStatusText}
              options={statusOptions}
              placeholder="בחרו או חפשו סטטוס טיפול"
              emptyText="לא נמצא סטטוס מתאים"
              ariaLabel="סטטוס טיפול במשוב"
              maxLength={120}
              disabled={!details.canUpdateTreatment}
              onClear={() => setStatusText("")}
            />
          </label>
          <label><span>פירוט / הערה</span>
            <UiTextarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} rows={4}
              disabled={!details.canUpdateTreatment}
              placeholder="הוסיפו פירוט חופשי לטיפול במקרה..." />
          </label>
        </div>
      </section>

      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head"><div><h3>היסטוריית טיפול</h3></div></div>
        {details.treatmentHistory.length ? <div className="feedback-treatment-history">
          {details.treatmentHistory.map((item, index) => <div key={`${item.createdAt}-${index}`}>
            <div><b>{item.statusLabel}</b><span>{item.updatedBy}</span></div>
            {item.previousStatusLabel ? <small>{item.previousStatusLabel} ← {item.statusLabel}</small> : null}
            {item.note ? <p>{item.note}</p> : null}
            <time>{formatDateTimeDDMMYYYY(item.createdAt, "—")}</time>
          </div>)}
        </div> : <div className="notice notice-info">עדיין לא בוצעו עדכוני טיפול ידניים.</div>}
      </section>
    </> : null}
  </AppModal>;
}
