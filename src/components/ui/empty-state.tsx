import type { ReactNode } from "react";

/** Empty result or "nothing here yet" message with an optional icon and next step. */
export function EmptyState({ icon, title, description, actions, className }: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <div className={["empty", className].filter(Boolean).join(" ")}>
    {icon ? <span className="empty-icon" aria-hidden="true">{icon}</span> : null}
    <b className="empty-title">{title}</b>
    {description ? <p className="empty-description">{description}</p> : null}
    {actions ? <div className="empty-actions">{actions}</div> : null}
  </div>;
}
