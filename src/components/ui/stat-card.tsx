import type { ReactNode } from "react";

export type StatTone = "blue" | "teal" | "navy" | "amber" | "neutral";

/**
 * A single headline figure. `pending` renders the value muted for metrics that have no data
 * source yet; never pass invented numbers.
 */
export function StatCard({ label, value, icon, tone = "blue", footer, pending = false }: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: StatTone;
  footer?: ReactNode;
  pending?: boolean;
}) {
  return <div className="stat-card" data-tone={tone === "blue" ? undefined : tone} data-pending={pending || undefined}>
    <div className="stat-top"><span>{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div>
    <div className="stat-value">{value}</div>
    {footer ? <div className="stat-foot">{footer}</div> : null}
  </div>;
}
