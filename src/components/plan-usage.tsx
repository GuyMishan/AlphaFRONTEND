"use client";

import type { EntitlementUsage } from "@/lib/types";

export function PlanUsage({ label, usage }: { label: string; usage: EntitlementUsage }) {
  const maximum = Math.max(usage.maximum, 1);
  const percent = Math.min(100, Math.round((usage.current / maximum) * 100));
  const full = usage.current >= usage.maximum;

  return <div className={`plan-usage${full ? " full" : ""}`}>
    <div className="plan-usage-head"><span>{label}</span><b>{usage.current}/{usage.maximum}</b></div>
    <div className="plan-usage-track" aria-label={`${usage.current} מתוך ${usage.maximum}`}>
      <span style={{ width: `${percent}%` }} />
    </div>
  </div>;
}
