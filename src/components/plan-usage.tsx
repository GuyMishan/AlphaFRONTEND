"use client";

import type { EntitlementUsage } from "@/lib/types";

export function PlanUsage({ label, usage }: { label: string; usage: EntitlementUsage }) {
  const unlimited = usage.maximum === null;
  const maximum = unlimited ? 1 : Math.max(usage.maximum, 1);
  const percent = unlimited ? 0 : Math.min(100, Math.round((usage.current / maximum) * 100));
  const full = !unlimited && usage.current >= usage.maximum;

  return <div className={`plan-usage${full ? " full" : ""}`}>
    <div className="plan-usage-head">
      <span>{label}</span>
      <b>{unlimited ? `${usage.current} / ללא הגבלה` : `${usage.current}/${usage.maximum}`}</b>
    </div>
    {!unlimited ? <div className="plan-usage-track" aria-label={`${usage.current} מתוך ${usage.maximum}`}>
      <span style={{ width: `${percent}%` }} />
    </div> : null}
  </div>;
}
