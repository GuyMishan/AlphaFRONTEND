"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/tooltip";

export type FieldErrors = Record<string, string | undefined>;

export function Field({ label, error, children, className = "field" }: { label: ReactNode; error?: string; children: ReactNode; className?: string }) {
  const short = error && error.length > 70 ? `${error.slice(0, 67)}...` : error;
  return <div className={`${className}${error ? " field-invalid" : ""}`} data-error={error || undefined}>
    <label className={error ? "field-label-error" : undefined}>{label}</label>
    {children}
    {error ? (short !== error
      ? <Tooltip content={error} label={error}><span className="field-error-text">{short}</span></Tooltip>
      : <span className="field-error-text">{short}</span>) : null}
  </div>;
}

export function clearFieldError<T extends FieldErrors>(errors: T, key: string): T {
  if (!errors[key]) return errors;
  return { ...errors, [key]: undefined };
}
