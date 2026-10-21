"use client";

import { Eye } from "lucide-react";
import { FeedbackErrorsButton } from "@/features/feedback/components/feedback-errors-button";
import { Tooltip } from "@/components/ui/tooltip";
import { UiActionMenu, UiAutocomplete } from "@/components/ui/ui-controls";
import { type ReportFeedbackDepositRow } from "@/features/feedback/api";
import { formatDateTimeDDMMYYYY } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/number";
import { pensionProductTypeLabel } from "@/features/reporting/labels";
import { DepositStatusBadge } from "@/features/feedback/components/feedback-status";
import { feedbackErrorScopeLabel, feedbackErrorSummaryRows, depositOwnedErrorCount } from "@/features/feedback/deposit-error-summary";
import { LoadingState } from "@/components/loading/loading-state";

export type ExpandedReportContent = {
  deposits: ReportFeedbackDepositRow[];
  hasMore: boolean;
  manufacturers: string[];
};
export function DepositFeedbackPanel({
  content,
  onOpen,
  onLoadMore,
  loading,
  loadingMore,
  manufacturerValue,
  onManufacturerValueChange,
}: {
  content: ExpandedReportContent;
  onOpen: (deposit: ReportFeedbackDepositRow, view: "details" | "errors") => void;
  onLoadMore: () => void;
  loading: boolean;
  loadingMore: boolean;
  manufacturerValue: string;
  onManufacturerValueChange: (value: string) => void;
}) {
  return <div className="report-deposits-panel">
    <div className="report-deposits-heading">
      <div>
        <b>הפקדות בדיווח</b>
        <small>כל שורה מייצגת עובד + מוצר. המשוב, מצב הכספים והטיפול נשארים מחוברים לאותה הפקדה.</small>
      </div>
      <label className="report-deposits-manufacturer-filter">
        <span>סינון לפי יצרן</span>
        <UiAutocomplete
          value={manufacturerValue}
          onValueChange={onManufacturerValueChange}
          options={content.manufacturers
            .filter((manufacturer) => !manufacturerValue || manufacturer.toLocaleLowerCase("he").includes(manufacturerValue.toLocaleLowerCase("he")))
            .map((manufacturer) => ({ value: manufacturer, label: manufacturer }))}
          placeholder="כל היצרנים"
          emptyText="לא נמצא יצרן בדיווח."
          ariaLabel="סינון ההפקדות לפי יצרן"
        />
      </label>
    </div>
    {loading
      ? <LoadingState compact label="טוען הפקדות ומשובים..." />
      : content.deposits.length === 0
        ? <div className="notice notice-info">לא נמצאו הפקדות משויכות לדיווח.</div>
        : <div className="report-deposits-grid" role="table" aria-label="הפקדות ומשובים לפי עובד ומוצר">
        <div className="report-deposits-header" role="row">
          <span role="columnheader">עובד</span>
          <span role="columnheader">סוג מוצר</span>
          <span role="columnheader">יצרן / מוצר</span>
          <span role="columnheader">סכום</span>
          <span role="columnheader">משוב</span>
          <span role="columnheader">מצב כספים</span>
          <span role="columnheader">סטטוס טיפול</span>
          <span role="columnheader">עודכן</span>
          <span role="columnheader">פעולות</span>
        </div>
        {content.deposits.map((deposit) => <div className="report-deposits-item" role="row" key={deposit.id}>
          <div role="cell"><b>{deposit.employeeName}</b></div>
          <div role="cell">{pensionProductTypeLabel(deposit.productType)}</div>
          <div role="cell">
            <b>{deposit.fundCompanyName || deposit.fundName || "מוצר פנסיוני"}</b>
            <small>{deposit.fundName && deposit.fundCompanyName ? deposit.fundName : deposit.policyNumber || "ללא מספר פוליסה"}</small>
          </div>
          <div role="cell" className="report-deposits-money">{formatMoney(deposit.totalAmount)}</div>
          <div role="cell" className="report-deposit-feedback-status-cell">
            <DepositStatusBadge value={deposit.feedbackStatus} label={deposit.feedbackLabel} />
            {depositOwnedErrorCount(deposit) > 0
              ? <Tooltip
                  className="report-deposit-feedback-info"
                  label="פירוט שגיאות במשוב"
                  content={<span className="report-deposit-feedback-error-list">
                    {feedbackErrorSummaryRows(deposit).map(({ scope, count }) =>
                      <span key={scope}>{count} {count === 1 ? "שגיאה" : "שגיאות"} {feedbackErrorScopeLabel(scope)}</span>)}
                  </span>}
                />
              : null}
          </div>
          <div role="cell"><DepositStatusBadge value={deposit.moneyStatus} label={deposit.moneyStatusLabel} /></div>
          <div role="cell">
            {deposit.treatmentStatusLabel
              ? <span className="report-treatment-label">{deposit.treatmentStatusLabel}</span>
              : <span className="muted-inline">לא עודכן</span>}
          </div>
          <div role="cell" className="muted-inline">{formatDateTimeDDMMYYYY(deposit.updatedAt, "—")}</div>
          <div role="cell" className="report-deposit-row-actions">
            <span className="report-deposit-errors-slot">
            {depositOwnedErrorCount(deposit) > 0 ? <FeedbackErrorsButton
              compact
              count={depositOwnedErrorCount(deposit)}
              onClick={() => onOpen(deposit, "errors")}
            /> : null}
            </span>
            <UiActionMenu
              ariaLabel={`פעולות עבור ${deposit.employeeName}`}
              items={[
                {
                  key: "view",
                  label: "צפייה בהפקדה",
                  icon: <Eye size={16} />,
                  onSelect: () => onOpen(deposit, "details"),
                },
              ]}
            />
          </div>
        </div>)}
      </div>}
    {!loading && content.hasMore ? <button className="btn btn-secondary btn-sm report-deposits-load-more" disabled={loadingMore} onClick={onLoadMore}>
      {loadingMore ? "טוען..." : "טעינת הפקדות נוספות"}
    </button> : null}
  </div>;
}
