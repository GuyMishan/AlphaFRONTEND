"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { FeedbackResolveButton } from "@/components/feedback-resolve-button";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";
import {
  reportFeedbackApi,
  type FeedbackResolutionProblemSelector,
  type ReportFeedbackDepositDetails,
} from "@/lib/report-feedback-api";
import {
  paymentConfirmationsApi,
  type PaymentConfirmation,
} from "@/lib/payment-confirmations-api";

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

function isActionableManufacturerError(code: number | null | undefined, isResolved = false) {
  return !isResolved && code != null && code !== 1 && code !== 31;
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

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("he-IL", { maximumFractionDigits: 1 })} MB`;
}

export function ReportDepositFeedbackModal({
  organizationId,
  employerId,
  reportId,
  reportProductId,
  hasFeedback,
  onClose,
  onEdit,
  onResolveOne,
  onResolveAll,
  viewMode = "details",
}: {
  organizationId: string;
  employerId: string;
  reportId: string;
  reportProductId: string;
  hasFeedback: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onResolveOne?: (selector: FeedbackResolutionProblemSelector) => void;
  onResolveAll?: () => void;
  viewMode?: "details" | "errors";
}) {
  const [details, setDetails] = useState<ReportFeedbackDepositDetails | null>(null);
  const [evidence, setEvidence] = useState<PaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const errorsOnly = viewMode === "errors";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      setEvidenceError("");
      try {
        const [detailsResult, evidenceResult] = await Promise.allSettled([
          reportFeedbackApi.depositDetails(organizationId, employerId, reportId, reportProductId),
          paymentConfirmationsApi.list(organizationId, employerId, reportId, reportProductId),
        ]);
        if (cancelled) return;
        if (detailsResult.status === "rejected") throw detailsResult.reason;
        setDetails(detailsResult.value);
        if (evidenceResult.status === "fulfilled") setEvidence(evidenceResult.value);
        else {
          setEvidence([]);
          setEvidenceError(evidenceResult.reason instanceof Error
            ? evidenceResult.reason.message
            : "טעינת אישורי התשלום נכשלה.");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "טעינת פרטי ההפקדה נכשלה");
          setDetails(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [organizationId, employerId, reportId, reportProductId, errorsOnly]);

  async function downloadEvidence(item: PaymentConfirmation) {
    if (downloadingId) return;
    setDownloadingId(item.id);
    setEvidenceError("");
    try {
      await paymentConfirmationsApi.download(organizationId, employerId, reportId, reportProductId, item);
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : "הורדת אישור התשלום נכשלה.");
    } finally {
      setDownloadingId("");
    }
  }

  return <AppModal
    width="xl"
    className={`report-deposit-feedback-modal${errorsOnly ? " feedback-errors-only" : ""}`}
    title={details ? `${errorsOnly ? "שגיאות בהפקדה" : "פרטי הפקדה ומשוב"} · ${details.employee.name}` : errorsOnly ? "שגיאות בהפקדה" : "פרטי הפקדה ומשוב"}
    subtitle={details
      ? [details.product.fundCompanyName, details.product.fundName, details.product.policyNumber ? `פוליסה ${details.product.policyNumber}` : ""]
          .filter(Boolean).join(" · ")
      : ""}
    onClose={onClose}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose}>סגירה</button>
      {!errorsOnly && onEdit ? <button type="button" className="btn btn-primary" onClick={onEdit}>תיקון הפקדה</button> : null}
    </>}
  >
    {loading ? <div className="empty">טוען פרטי הפקדה ומשוב...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {details ? <>
      <>
        <section className="feedback-modal-summary" aria-label="סיכום הפקדה">
          <div><span>עובד</span><b>{details.employee.name}</b><small>ת״ז {details.employee.nationalId}</small></div>
          <div><span>חודש שכר</span><b>{details.product.salaryMonth?.slice(0, 7).split("-").reverse().join("/")}</b></div>
          <div><span>שכר מבוטח</span><b>{money(details.product.salary)}</b></div>
          <div><span>סה״כ הפקדה</span><b>{money(details.product.totalAmount)}</b></div>
        </section>

        <div className="feedback-view-status">
          {hasFeedback
            ? <span className="feedback-state completed"><CheckCircle2 size={14} />התקבל משוב</span>
            : <span className="feedback-state pending">טרם התקבל משוב</span>}
        </div>
      </>

      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3>פרטי ההפקדה</h3><p>פרטי התשלום והאסמכתאות כפי שנשמרו בדיווח.</p></div>
        </div>
        <div className="money-feedback-grid">
          <div><span>חשבון יצרן</span><b dir="ltr">{details.payment?.providerAccount || "—"}</b></div>
          <div><span>אמצעי תשלום</span><b>{details.payment?.paymentMethod || "—"}</b></div>
          <div><span>חשבון מעסיק</span><b dir="ltr">{details.payment?.employerAccount || "—"}</b></div>
          <div><span>בנק מעסיק</span><b>{details.payment?.employerBankName || "—"}</b></div>
          <div><span>סניף</span><b dir="ltr">{details.payment?.employerBranch || "—"}</b></div>
          <div><span>אסמכתא</span><b dir="ltr">{details.payment?.referenceNumber || "—"}</b></div>
          <div><span>תאריך ערך</span><b>{details.payment?.valueDate ? formatDateTimeDDMMYYYY(details.payment.valueDate, "—") : "—"}</b></div>
          <div><span>תאריך ערך נאמנות</span><b>{details.payment?.trustAccountValueDate ? formatDateTimeDDMMYYYY(details.payment.trustAccountValueDate, "—") : "—"}</b></div>
          <div><span>סכום שהופקד בפועל</span><b>{money(details.payment?.actualDepositAmount)}</b></div>
          <div><span>קוד מס״ב</span><b dir="ltr">{details.payment?.masavSenderCode || "—"}</b></div>
        </div>

        <div className="feedback-evidence-panel">
          <div className="feedback-evidence-heading">
            <div><h4>אישורי תשלום</h4><small>המסמכים שנשמרו עבור ההפקדה.</small></div>
          </div>
          {evidenceError ? <div className="notice notice-error">{evidenceError}</div> : null}
          {evidence.length ? <div className="feedback-evidence-list">
            {evidence.map((item) => <button
              key={item.id}
              type="button"
              className="feedback-evidence-item"
              disabled={downloadingId === item.id}
              onClick={() => void downloadEvidence(item)}
            >
              <FileText size={16} />
              <span><b>{item.originalFileName}</b><small>{fileSize(item.sizeBytes)} · {formatDateTimeDDMMYYYY(item.createdAt, "—")}</small></span>
              <Download size={15} />
            </button>)}
          </div> : !evidenceError ? <div className="muted-inline">לא צורפו אישורי תשלום.</div> : null}
        </div>
      </section>

      {!hasFeedback ? <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3>רכיבי ההפרשה שדווחו</h3><p>הנתונים שנשלחו עבור העובד והמוצר.</p></div>
        </div>
        <div className="contribution-comparison-list">
          {details.employerContributions.map((item) => <article className="contribution-comparison-card" key={item.id}>
            <div className="contribution-comparison-title"><strong>{item.label}</strong></div>
            <div className="contribution-side employer">
              <div><small>סכום</small><b>{money(item.amount)}</b></div>
              <div><small>שיעור</small><b>{percent(item.percentage)}</b></div>
              <div><small>שכר</small><b>{money(details.product.salary)}</b></div>
            </div>
          </article>)}
          {details.employerContributions.length === 0
            ? <div className="notice notice-info">לא נמצאו רכיבי הפרשה בהפקדה.</div>
            : null}
        </div>
      </section> : null}

      {hasFeedback ? <>
        <section className="feedback-modal-section">
          <div className="feedback-modal-section-head">
            <div><h3>{errorsOnly ? "שגיאות בהפקדה" : "מעסיק מול יצרן"}</h3><p>{errorsOnly ? "תקלות עובד והפקדה מוצגות למעלה; תקלות הפרשה מוצגות ליד הרכיב המתאים." : "השוואה בין מה שדווח לבין הנתונים שהוחזרו במשוב הרשמי."}</p></div>
          </div>
          {(() => {
            const rowsByErrorCode = new Map<number, typeof details.manufacturerContributions>();
            for (const item of details.manufacturerContributions) {
              if (!isActionableManufacturerError(item.errorCode, item.isResolved) || item.errorCode == null
                  || (item.targetScope !== "deposit" && item.targetScope !== "employee")) continue;
              const current = rowsByErrorCode.get(item.errorCode) ?? [];
              current.push(item);
              rowsByErrorCode.set(item.errorCode, current);
            }

            const promotedErrorCodes = new Set<number>();
            for (const [code, rows] of rowsByErrorCode) {
              const semanticGeneralError = rows.some((row) =>
                row.targetScope === "employee" || row.errorScope !== "contribution");
              if (semanticGeneralError) promotedErrorCodes.add(code);
            }

            const scopeLabel = (scope: "employee" | "deposit") => {
              switch (scope) {
                case "employee": return "עובד";
                case "deposit": return "הפקדה / מוצר והפרשות";
                default: return "מידע";
              }
            };

            const scopeOrder: Array<"employee" | "deposit"> = [
              "employee", "deposit",
            ];
            const groupedErrors = scopeOrder
              .map((scope) => {
                const items = Array.from(rowsByErrorCode.entries())
                  .map(([code, rows]) => ({ code, rows }))
                  .filter(({ rows }) => rows.some((row) => row.targetScope === scope
                    && (scope !== "deposit" || row.errorScope !== "contribution")))
                  .map(({ code, rows }) => {
                    const first = rows.find((row) => row.targetScope === scope
                      && (scope !== "deposit" || row.errorScope !== "contribution")) ?? rows[0];
                    return {
                      code,
                      description: first?.errorDescription || `קוד שגיאה ${code}`,
                    };
                  });
                return { scope, items };
              })
              .filter((group) => group.items.length > 0);

            return <>
              {errorsOnly && groupedErrors.length ? <div className="feedback-error-groups" role="alert">
                <div className="feedback-error-groups-title">
                  <div className="feedback-error-groups-title-copy">
                    <AlertTriangle size={16} />
                    <strong>בעיות שנמצאו במשוב</strong>
                  </div>
                  {onResolveAll ? <FeedbackResolveButton label="פתור בעיות" onClick={onResolveAll} /> : null}
                </div>
                {groupedErrors.map(({ scope, items }) =>
                  <section className="feedback-error-group" key={scope}>
                    <div className="feedback-error-group-head">
                      <strong>{scopeLabel(scope)}</strong>
                      <span>{items.length} {items.length === 1 ? "שגיאה" : "שגיאות"}</span>
                    </div>
                    <div className="feedback-error-group-list">
                      {items.map(({ code, description }) =>
                        <div className="feedback-error-action-row" key={code}>
                          <div className="feedback-error-copy">
                            <b>קוד {code}</b>
                            <span>{description}</span>
                          </div>
                          <FeedbackResolveButton
                            compact
                            onClick={() => onResolveOne?.({ code })}
                            disabled={!onResolveOne}
                          />
                        </div>)}
                    </div>
                  </section>)}
              </div> : null}
              <div className="contribution-comparison-list">
            {details.employerContributions.map((employer) => {
              const manufacturerRows = details.manufacturerContributions.filter((item) => item.contributionId === employer.id);
              const manufacturer = manufacturerRows.find((item) => item.contributionTypeCode === employer.contributionTypeCode)
                ?? manufacturerRows[0];
              const localErrorRows = manufacturerRows.filter((item) =>
                isActionableManufacturerError(item.errorCode, item.isResolved)
                && item.errorCode != null
                && item.targetScope === "deposit"
                && item.errorScope === "contribution"
                && !promotedErrorCodes.has(item.errorCode));
              const additionalManufacturerRows = manufacturerRows.filter((item) =>
                item !== manufacturer
                && !isActionableManufacturerError(item.errorCode, item.isResolved));
              const amountMismatch = manufacturer?.contributionAmount != null && !sameNumber(employer.amount, manufacturer.contributionAmount);
              const rateMismatch = manufacturer?.contributionRate != null && !sameNumber(employer.percentage, manufacturer.contributionRate);
              const salaryMismatch = manufacturer?.calculatedSalary != null && !sameNumber(details.product.salary, manufacturer.calculatedSalary);
              const hasError = localErrorRows.length > 0;
              const hasNumericDifference = amountMismatch || rateMismatch || salaryMismatch;
              const requiresAttention = errorsOnly && (hasNumericDifference || hasError);
              return <article className={`contribution-comparison-card${requiresAttention ? " has-difference" : ""}`} key={employer.id}>
                <div className="contribution-comparison-title">
                  <strong>{employer.label}</strong>
                  {manufacturer
                    ? errorsOnly && hasNumericDifference
                      ? <span className="feedback-state attention"><AlertTriangle size={14} />נמצא פער בנתונים</span>
                      : errorsOnly && hasError
                        ? <span className="feedback-state attention"><AlertTriangle size={14} />שגיאת יצרן</span>
                        : <span className="feedback-state completed"><CheckCircle2 size={14} />התקבל משוב</span>
                    : <span className="feedback-state pending">לא התקבל פירוט יצרן לרכיב</span>}
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
                      <div className={errorsOnly && amountMismatch ? "value-difference" : ""}><small>סכום</small><b>{money(manufacturer.contributionAmount)}</b></div>
                      <div className={errorsOnly && rateMismatch ? "value-difference" : ""}><small>שיעור</small><b>{percent(manufacturer.contributionRate)}</b></div>
                      <div className={errorsOnly && salaryMismatch ? "value-difference" : ""}><small>שכר מחושב</small><b>{money(manufacturer.calculatedSalary)}</b></div>
                    </> : <div className="manufacturer-pending">לא התקבל פירוט יצרן לרכיב זה.</div>}
                  </div>
                </div>
                {errorsOnly && localErrorRows.length
                  ? <div className="contribution-error-list">
                      {localErrorRows.map((localError, index) => <div
                        className="contribution-feedback-message error feedback-contribution-error-action"
                        key={`${localError.errorCode ?? "error"}:${localError.sequence}:${index}`}
                      >
                        <AlertTriangle size={15} />
                        <span className="contribution-feedback-error-copy">
                          {localError.errorCode != null ? <b>קוד {localError.errorCode}</b> : null}
                          <span>{localError.errorDescription || "ללא פירוט שגיאה"}</span>
                        </span>
                        <FeedbackResolveButton
                          compact
                          onClick={() => localError.errorCode != null
                            ? onResolveOne?.({ code: localError.errorCode, contributionId: localError.contributionId })
                            : undefined}
                          disabled={!onResolveOne || localError.errorCode == null}
                        />
                      </div>)}
                    </div>
                  : null}
                {manufacturer?.sourceFileName
                  ? <small className="feedback-source">מקור: {manufacturer.sourceFileName} · {formatDateTimeDDMMYYYY(manufacturer.receivedAt, "—")}</small>
                  : null}
                {errorsOnly && additionalManufacturerRows.length ? <div className="manufacturer-extra-rows">
                  <small>משובי יצרן נוספים לאותו רכיב</small>
                  {additionalManufacturerRows.map((item) => <div key={`${item.recordIdentifier}:${item.sequence}`}>
                    <span className="manufacturer-extra-error">
                      <b>{item.errorCode != null ? `קוד ${item.errorCode}` : contributionTypeLabel(item.contributionTypeCode)}</b>
                      <small>{item.errorDescription || "ללא פירוט שגיאה"}</small>
                    </span>
                    <span>{money(item.contributionAmount)}</span>
                    <span>{percent(item.contributionRate)}</span>
                    <span>{money(item.calculatedSalary)}</span>
                  </div>)}
                </div> : null}
              </article>;
            })}
              </div>
            </>;
          })()}
        </section>
      </> : null}

      {hasFeedback ? <>
        <section className="feedback-modal-section">
          <div className="feedback-modal-section-head">
            <div><h3>מצב כספים</h3><p>מצב הכספים שהוחזר במשוב הרשמי ברמת העברת הכספים.</p></div>
          </div>
          {details.money ? <div className="money-feedback-grid">
            <div><span>דווח לקופה</span><b>{money(details.money.reportedDepositAmount)}</b></div>
            <div><span>נקלט בפועל</span><b>{money(details.money.actualReceivedAmount)}</b></div>
            <div><span>שויך לעובדים</span><b>{money(details.money.allocatedAmount)}</b></div>
            <div><span>במעבר</span><b>{money(details.money.inTransitAmount)}</b></div>
            <div><span>סטטוס טיפול בכספים</span><b>{details.money.moneyTreatmentStatus ?? "—"}</b></div>
            <div><span>אסמכתא</span><b dir="ltr">{details.money.paymentReference || details.payment?.referenceNumber || "—"}</b></div>
            {details.money.statusDetail ? <div className="feedback-money-detail"><span>פירוט</span><b>{details.money.statusDetail}</b></div> : null}
          </div> : <div className="muted-inline">לא התקבל פירוט כספי במשוב.</div>}
        </section>

        <section className="feedback-modal-section">
          <div className="feedback-modal-section-head">
            <div><h3>טיפול במשוב</h3><p>מצב הטיפול הפנימי וההערה האחרונה ב־ALPHA.</p></div>
          </div>
          {details.treatment ? <div className="feedback-treatment-view">
            <div><span>סטטוס טיפול</span><b>{details.treatment.label}</b></div>
            <div><span>עודכן על ידי</span><b>{details.treatment.updatedBy || "—"}</b></div>
            <div><span>עודכן בתאריך</span><b>{formatDateTimeDDMMYYYY(details.treatment.updatedAt, "—")}</b></div>
            {details.treatment.note ? <div className="feedback-treatment-note"><span>הערה</span><p>{details.treatment.note}</p></div> : null}
          </div> : <div className="muted-inline">לא עודכן טיפול פנימי.</div>}
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
          </div> : <div className="muted-inline">עדיין לא בוצעו עדכוני טיפול.</div>}
        </section>
      </> : null}
    </> : null}
  </AppModal>;
}
