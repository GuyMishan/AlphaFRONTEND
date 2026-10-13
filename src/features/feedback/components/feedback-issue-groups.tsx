"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { FeedbackResolveButton } from "@/features/feedback/components/feedback-resolve-button";
import type { FeedbackResolutionProblemSelector } from "@/features/feedback/api";

export type FeedbackDisplayIssue = {
  code: number;
  description: string;
  scope: string;
  reportId?: string | null;
  affectedReportIds?: string[] | null;
};

function scopeLabel(scope: string) {
  switch (scope) {
    case "report": return "דיווח";
    case "employer": return "מעסיק";
    case "money": return "כספים";
    case "employee": return "עובד";
    case "deposit": return "הפקדה / מוצר והפרשות";
    case "contribution": return "רכיבי הפקדה";
    default: return "אחר";
  }
}

export function FeedbackIssueGroups({
  issues,
  order,
  onResolveOne,
  onResolveAll,
  onOpenReport,
}: {
  issues: FeedbackDisplayIssue[];
  order: string[];
  onResolveOne?: (selector: FeedbackResolutionProblemSelector) => void;
  onResolveAll?: () => void;
  onOpenReport?: (reportId: string) => void;
}) {
  const groups = useMemo(() => order
    .map(scope => ({
      scope,
      items: issues.filter(item => item.scope === scope),
    }))
    .filter(group => group.items.length > 0), [issues, order]);

  if (!groups.length) return <div className="notice notice-info">לא נמצאו תקלות פתוחות בהקשר הזה.</div>;

  return <div className="feedback-error-groups" role="list">
    <div className="feedback-error-groups-title">
      <div className="feedback-error-groups-title-copy">
        <AlertTriangle size={16} />
        <strong>תקלות שדורשות טיפול</strong>
      </div>
      {onResolveAll ? <FeedbackResolveButton count={issues.length} label="פתור בעיות" onClick={onResolveAll} /> : null}
    </div>
    {groups.map(group => <section className="feedback-error-group" key={group.scope} role="listitem">
      <div className="feedback-error-group-head">
        <strong>{scopeLabel(group.scope)}</strong>
        <span>{group.items.length} {group.items.length === 1 ? "תקלה" : "תקלות"}</span>
      </div>
      <div className="feedback-error-group-list">
        {group.items.map((item, index) => <div className="feedback-error-action-row" key={`${item.code}:${item.reportId}:${index}`}>
          <div className="feedback-error-copy">
            <b>{item.code > 0 ? `קוד ${item.code}` : "תקלה"}</b>
            <span>{item.description}</span>
            {item.affectedReportIds?.length
              ? <div className="feedback-linked-reports">
                  <small>דיווחים מושפעים ({item.affectedReportIds.length}):</small>
                  {item.affectedReportIds.map(id =>
                    <button key={id} type="button" className="btn btn-secondary"
                      onClick={() => onOpenReport?.(id)} disabled={!onOpenReport}
                      title={id} aria-label={`פתיחת דיווח ${id}`}>
                      דיווח {id.slice(0, 8)}
                    </button>)}
                </div>
              : null}
          </div>
          {item.code > 0 && onResolveOne ? <FeedbackResolveButton
            compact
            onClick={() => onResolveOne({ code: item.code })}
          /> : null}
        </div>)}
      </div>
    </section>)}
  </div>;
}


