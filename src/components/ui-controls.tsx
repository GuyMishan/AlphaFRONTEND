"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Tooltip } from "@/components/tooltip";
import { formatDateDDMMYYYY, normalizeDDMMYYYYInput, parseDDMMYYYY } from "@/lib/date-format";

type ControlSize = "default" | "compact";

function controlClass(base: string, size: ControlSize, className?: string) {
  return [base, size === "compact" ? "ui-control-compact" : "ui-control-default", className].filter(Boolean).join(" ");
}

export const UiInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { controlSize?: ControlSize }>(
  function UiInput({ className, controlSize = "default", ...props }, ref) {
    return <input ref={ref} className={controlClass("ui-control", controlSize, className)} {...props} />;
  },
);

export function UiDateInput({
  value,
  onValueChange,
  min,
  max,
  className,
  controlSize = "default",
  onBlur,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max"> & {
  value?: string | null;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  controlSize?: ControlSize;
}) {
  const [displayValue, setDisplayValue] = useState(() => formatDateDDMMYYYY(value));

  useEffect(() => {
    setDisplayValue(formatDateDDMMYYYY(value));
  }, [value]);

  function commit(nextDisplay: string) {
    if (!nextDisplay) {
      onValueChange("");
      return true;
    }

    const iso = parseDDMMYYYY(nextDisplay);
    if (!iso) return false;
    if (min && iso < min) return false;
    if (max && iso > max) return false;
    onValueChange(iso);
    return true;
  }

  return <input
    {...props}
    type="text"
    inputMode="numeric"
    dir="ltr"
    placeholder={props.placeholder ?? "DD/MM/YYYY"}
    maxLength={10}
    value={displayValue}
    className={controlClass("ui-control", controlSize, className)}
    onChange={(event) => {
      const nextDisplay = normalizeDDMMYYYYInput(event.target.value);
      setDisplayValue(nextDisplay);
      if (nextDisplay === "" || nextDisplay.length === 10) commit(nextDisplay);
    }}
    onBlur={(event) => {
      if (!commit(displayValue)) {
        onValueChange("");
        setDisplayValue("");
      }
      onBlur?.(event);
    }}
  />;
}

export const UiSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { controlSize?: ControlSize }>(
  function UiSelect({ className, controlSize = "default", ...props }, ref) {
    return <select ref={ref} className={controlClass("ui-control", controlSize, className)} {...props} />;
  },
);

export const UiTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { controlSize?: ControlSize }>(
  function UiTextarea({ className, controlSize = "default", ...props }, ref) {
    return <textarea ref={ref} className={controlClass("ui-control ui-textarea", controlSize, className)} {...props} />;
  },
);

export function UiChoiceCard({
  selected = false,
  compact = false,
  children,
  className,
  tooltip,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  compact?: boolean;
  children: ReactNode;
  tooltip?: string;
}) {
  const button = <button
    type="button"
    className={[
      "choice-card",
      compact ? "compact-choice-card" : "",
      selected ? "selected" : "",
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >{children}</button>;

  return tooltip ? <Tooltip content={tooltip} label={tooltip} className="tooltip-fill">{button}</Tooltip> : button;
}

export function UiCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={["card", className].filter(Boolean).join(" ")}>{children}</section>;
}
