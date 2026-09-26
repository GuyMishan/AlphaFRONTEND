"use client";

import {
  forwardRef,
  useRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CalendarDays } from "lucide-react";
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
  disabled,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max"> & {
  value?: string | null;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  controlSize?: ControlSize;
}) {
  const [displayValue, setDisplayValue] = useState(() => formatDateDDMMYYYY(value));
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayValue(formatDateDDMMYYYY(value));
  }, [value]);

  function commit(nextDisplay: string) {
    if (!nextDisplay) {
      onValueChange("");
      return true;
    }
    const iso = parseDDMMYYYY(nextDisplay);
    if (!iso || (min && iso < min) || (max && iso > max)) return false;
    onValueChange(iso);
    return true;
  }

  function openPicker() {
    if (disabled) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return <div className={["ui-date-control", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
    <input
      {...props}
      type="text"
      inputMode="numeric"
      dir="ltr"
      disabled={disabled}
      placeholder={props.placeholder ?? "DD/MM/YYYY"}
      maxLength={10}
      value={displayValue}
      className={controlClass("ui-control ui-date-text", controlSize)}
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
    />
    <button type="button" className="ui-date-picker-button" onClick={openPicker} disabled={disabled} aria-label="פתיחת לוח שנה">
      <CalendarDays size={18} />
    </button>
    <input
      ref={pickerRef}
      type="date"
      tabIndex={-1}
      aria-hidden="true"
      className="ui-date-native-picker"
      value={value ?? ""}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    />
  </div>;
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
