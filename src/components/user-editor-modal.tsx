"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function UserEditorModal({
  title,
  subtitle,
  children,
  actions,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return <div className="user-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="user-modal-head">
        <div>
          <h2 id="user-modal-title">{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button className="user-modal-close" type="button" onClick={onClose} aria-label="סגירה"><X size={20} /></button>
      </div>
      <div className="user-modal-body">{children}</div>
      {actions ? <div className="user-modal-actions">{actions}</div> : null}
    </section>
  </div>;
}
