"use client";

import type { EntitlementUsage } from "@/lib/types";

export function PlanUsage({ label, usage }: { label: string; usage: EntitlementUsage }) {
  const limit = usage.maximum;
  if (limit === null) return null;

  const maximum = Math.max(limit, 1);
  const percent = Math.min(100, Math.round((usage.current / maximum) * 100));
  const full = usage.current >= limit;

  return <div className={`plan-usage${full ? " full" : ""}`}>
    <div className="plan-usage-head">
      <span>{label}</span>
      <b>{usage.current}/{limit}</b>
    </div>
    <div className="plan-usage-track" aria-label={`${usage.current} מתוך ${limit}`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  </div>;
}
