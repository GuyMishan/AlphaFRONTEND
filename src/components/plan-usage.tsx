"use client";

import type { EntitlementUsage } from "@/lib/types";

export function PlanUsage({ label, usage }: { label: string; usage: EntitlementUsage }) {
  const limit = usage.maximum;
  const unlimited = limit === null;
  const maximum = limit === null ? 1 : Math.max(limit, 1);
  const percent = unlimited ? 0 : Math.min(100, Math.round((usage.current / maximum) * 100));
  const full = limit !== null && usage.current >= limit;

  return <div className={`plan-usage${full ? " full" : ""}`}>
    <div className="plan-usage-head">
      <span>{label}</span>
      <b>{unlimited ? `${usage.current} / ללא הגבלה` : `${usage.current}/${limit}`}</b>
    </div>
    {!unlimited ? <div className="plan-usage-track" aria-label={`${usage.current} מתוך ${limit}`}>
      <span style={{ width: `${percent}%` }} />
    </div> : null}
  </div>;
}
