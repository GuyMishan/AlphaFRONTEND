"use client";

type Details = { errorAmount?: number | string | null; errorDate?: string | null };

export function FeedbackErrorDetails({
  details,
  allDetails,
}: {
  details?: Details;
  allDetails?: Details[];
}) {
  const records = allDetails ?? (details ? [details] : []);
  const unique = new Map<string, { detail: Details; count: number }>();
  for (const detail of records) {
    const amount = detail.errorAmount;
    const date = detail.errorDate;
    if ((amount === null || amount === undefined || amount === "") && !date) continue;
    const key = JSON.stringify([amount == null ? null : String(amount), date || null]);
    const existing = unique.get(key);
    if (existing) existing.count += 1;
    else unique.set(key, { detail, count: 1 });
  }
  if (!unique.size) return null;

  return <section className="feedback-error-detail-fields" aria-label="פירוט השגיאה">
    {allDetails && unique.size > 1 ? <strong>פירוטי שגיאה ({unique.size})</strong> : null}
    <div className="feedback-error-detail-list">
      {[...unique.values()].map(({ detail, count }, index) => <div key={index} className="feedback-error-detail-line">
        {detail.errorAmount !== null && detail.errorAmount !== undefined && detail.errorAmount !== ""
          ? <small>סכום: <b dir="ltr">{String(detail.errorAmount)}</b></small> : null}
        {detail.errorDate ? <small>תאריך: <b dir="ltr">{detail.errorDate}</b></small> : null}
        {count > 1 && allDetails ? <small>({count} רשומות)</small> : null}
      </div>)}
    </div>
  </section>;
}
