import type { ReactNode } from "react";

/**
 * Standard page title block: optional eyebrow, the page h1, a short description and the
 * page-level actions (placed on the RTL left; full width on phones).
 */
export function PageHeader({ title, description, eyebrow, actions, className }: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return <div className={["page-head", className].filter(Boolean).join(" ")}>
    <div>
      {eyebrow ? <div className="page-head-eyebrow">{eyebrow}</div> : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
    {actions ? <div className="page-head-actions">{actions}</div> : null}
  </div>;
}
