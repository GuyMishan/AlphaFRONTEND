"use client";

import {
  Children,
  forwardRef,
  isValidElement,
  useRef,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type RefObject,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CalendarDays, ChevronDown, EllipsisVertical, X } from "lucide-react";
import { createPortal } from "react-dom";
import { LoadingState } from "@/components/loading/loading-state";
import { nextEnabledOption, useFloatingMenu } from "@/components/ui/floating-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateDDMMYYYY, normalizeDDMMYYYYInput, parseDDMMYYYY } from "@/lib/format/date";

type ControlSize = "default" | "compact";

function controlClass(base: string, size: ControlSize, className?: string) {
  return [base, size === "compact" ? "ui-control-compact" : "ui-control-default", className].filter(Boolean).join(" ");
}

function setRef<T>(ref: ForwardedRef<T>, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/**
 * Forms render `<div className="field"><label>…</label><Control /></div>` (directly or via Field)
 * without htmlFor. After mount, link that label to the control so the control gets an accessible
 * name and clicking the label focuses it. Explicit aria-label / aria-labelledby always win.
 */
function useFieldLabelLink(ref: RefObject<HTMLElement | null>, enabled = true) {
  const generatedId = useId();
  useEffect(() => {
    const control = ref.current;
    if (!enabled || !control || control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby")) return;
    const label = control.closest(".field")?.querySelector<HTMLLabelElement>(":scope > label");
    if (!label || label.contains(control) || (label.htmlFor && label.htmlFor !== control.id)) return;
    if (!control.id) control.id = `${generatedId}-control`;
    label.htmlFor = control.id;
  });
}

const UNLABELLED_INPUT_TYPES = new Set(["checkbox", "radio", "hidden", "file"]);

export const UiInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { controlSize?: ControlSize }>(
  function UiInput({ className, controlSize = "default", ...props }, ref) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    useFieldLabelLink(inputRef, !UNLABELLED_INPUT_TYPES.has(props.type ?? "text"));
    return <input ref={(node) => { inputRef.current = node; setRef(ref, node); }}
      className={controlClass("ui-control", controlSize, className)} {...props} />;
  },
);

/** Native checkbox with consistent styling across the application. Keep native keyboard and screen-reader behavior. */
export const UiCheckbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "controlSize">>(
  function UiCheckbox({ className, ...props }, ref) {
    return <input {...props} ref={ref} type="checkbox" className={["ui-checkbox", className].filter(Boolean).join(" ")} />;
  },
);

function formatDateInputValue(raw: string | null | undefined, isMonth: boolean) {
  if (!raw) return "";
  if (!isMonth) return formatDateDDMMYYYY(raw);
  const [year, month] = raw.slice(0, 7).split("-");
  return year && month ? `${month}/${year}` : "";
}

export function UiDateInput({
  value,
  onValueChange,
  min,
  max,
  className,
  controlSize = "default",
  onBlur,
  disabled,
  readOnly,
  mode = "day",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max"> & {
  value?: string | null;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  controlSize?: ControlSize;
  mode?: "day" | "month";
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  useFieldLabelLink(textRef);
  const isMonth = mode === "month";
  const [displayValue, setDisplayValue] = useState(() => formatDateInputValue(value, isMonth));

  useEffect(() => { setDisplayValue(formatDateInputValue(value, isMonth)); }, [value, isMonth]);

  function commit(nextDisplay: string) {
    if (!nextDisplay) { onValueChange(""); return true; }
    if (isMonth) {
      const match = nextDisplay.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
      if (!match) return false;
      const iso = `${match[2]}-${match[1]}`;
      if ((min && iso < min.slice(0, 7)) || (max && iso > max.slice(0, 7))) return false;
      onValueChange(iso); return true;
    }
    const iso = parseDDMMYYYY(nextDisplay);
    if (!iso || (min && iso < min) || (max && iso > max)) return false;
    onValueChange(iso); return true;
  }

  function normalizeMonthInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  function openPicker() {
    if (disabled || readOnly) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return <div className={["ui-date-control", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
    <input {...props} ref={textRef} type="text" inputMode="numeric" dir="ltr" disabled={disabled} readOnly={readOnly}
      placeholder={props.placeholder ?? (isMonth ? "חודש/שנה" : "יום/חודש/שנה")}
      maxLength={isMonth ? 7 : 10} value={displayValue}
      className={controlClass("ui-control ui-date-text", controlSize)}
      onChange={(event) => {
        const nextDisplay = isMonth ? normalizeMonthInput(event.target.value) : normalizeDDMMYYYYInput(event.target.value);
        setDisplayValue(nextDisplay);
        if (nextDisplay === "" || nextDisplay.length === (isMonth ? 7 : 10)) commit(nextDisplay);
      }}
      onBlur={(event) => {
        if (!commit(displayValue)) { onValueChange(""); setDisplayValue(""); }
        onBlur?.(event);
      }} />
    {!disabled && !readOnly ? <>
      <button type="button" className="ui-date-picker-button" onClick={openPicker} aria-label={isMonth ? "פתיחת בחירת חודש" : "פתיחת לוח שנה"}><CalendarDays size={18} /></button>
      <input ref={pickerRef} type={isMonth ? "month" : "date"} tabIndex={-1} aria-hidden="true"
        className="ui-date-native-picker" value={value ?? ""} min={min} max={max}
        onChange={(event) => onValueChange(event.target.value)} />
    </> : null}
  </div>;
}

// Portalled menus are required because modal/table/field overflow otherwise clips them.
export const UiSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { controlSize?: ControlSize }>(
  function UiSelect({ className, controlSize = "default", children, value, defaultValue, disabled, onChange, ...props }, forwardedRef) {
    const nativeRef = useRef<HTMLSelectElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    useFieldLabelLink(triggerRef);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const menuId = useId();
    const options = Children.toArray(children).filter(isValidElement).map((child) => {
      const optionProps = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      return { value: String(optionProps.value ?? ""), label: optionProps.children, disabled: Boolean(optionProps.disabled) };
    });
    const [uncontrolledValue, setUncontrolledValue] = useState(() => defaultValue === undefined ? undefined : String(defaultValue));
    const selectedValue = String(value ?? uncontrolledValue ?? options[0]?.value ?? "");
    const selected = options.find((option) => option.value === selectedValue);

    const { mounted, placement } = useFloatingMenu({
      open, setOpen, anchorRef: triggerRef, menuRef,
      desiredHeight: Math.min(260, Math.max(40, options.length * 40 + 14)),
    });
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

    useEffect(() => {
      if (!open) return;
      const option = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active];
      option?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    function assignRef(node: HTMLSelectElement | null) {
      nativeRef.current = node;
      // Form libraries focus the native ref; the visible combobox receives that focus.
      if (node) node.focus = (options) => triggerRef.current?.focus(options);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }
    function choose(nextValue: string) {
      const select = nativeRef.current;
      if (!select) return;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(select, nextValue);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      setOpen(false);
      triggerRef.current?.focus();
    }
    function moveActive(direction: number) {
      setActive(current => nextEnabledOption(options, open ? current : options.findIndex(option => option.value === selectedValue), direction));
    }
    const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) setOpen(true);
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" || event.key === " ") {
        if (open) {
          event.preventDefault();
          const option = options[active];
          if (option && !option.disabled) choose(option.value);
        }
      } else if (event.key === "Home" && open) {
        event.preventDefault(); setActive(options.findIndex(option => !option.disabled));
      } else if (event.key === "End" && open) {
        event.preventDefault(); setActive(options.findLastIndex(option => !option.disabled));
      }
    };

    return <div className={["ui-select", open ? "is-open" : "", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
      <select ref={assignRef} value={value} defaultValue={value === undefined ? defaultValue : undefined} disabled={disabled} onChange={(event) => {
        if (value === undefined) setUncontrolledValue(event.target.value);
        onChange?.(event);
      }}
        className="ui-select-native" tabIndex={-1} aria-hidden="true" {...props}>{children}</select>
      <button ref={triggerRef} type="button" className={controlClass("ui-control ui-select-trigger", controlSize)} disabled={disabled}
        role="combobox" aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]}
        aria-invalid={props["aria-invalid"]} aria-required={props.required || props["aria-required"] || undefined}
        aria-haspopup="listbox" aria-controls={open ? menuId : undefined} aria-expanded={open}
        aria-activedescendant={open && options[active] ? `${menuId}-option-${active}` : undefined} onKeyDown={keyDown}
        onClick={() => {
          const selectedIndex = options.findIndex(option => option.value === selectedValue && !option.disabled);
          setActive(selectedIndex >= 0 ? selectedIndex : nextEnabledOption(options, -1, 1));
          setOpen(current => !current);
        }}>
        <span>{selected?.label ?? ""}</span><ChevronDown size={17} />
      </button>
      {open && mounted && !disabled ? createPortal(
        <div ref={menuRef} id={menuId} className="ui-select-menu ui-select-menu-portal" role="listbox" style={placement}
          onClick={event => event.stopPropagation()}
          aria-label={props["aria-label"]}>
          {options.map((option, index) => <button key={option.value} id={`${menuId}-option-${index}`} type="button" role="option"
            aria-selected={option.value === selectedValue} tabIndex={-1}
            disabled={option.disabled} className={option.value === selectedValue || active === index ? "selected" : ""}
            onMouseEnter={() => setActive(index)} onClick={() => choose(option.value)}>{option.label}</button>)}
        </div>, document.body,
      ) : null}
    </div>;
  },
);


export type UiActionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
};

export function UiActionMenu({
  items,
  ariaLabel = "פעולות נוספות",
}: {
  items: UiActionMenuItem[];
  ariaLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const { mounted, placement } = useFloatingMenu({
    open, setOpen, anchorRef: triggerRef, menuRef,
    desiredHeight: Math.max(48, items.length * 48 + 14), desiredWidth: 260,
  });

  // Focus lands on the first item once the panel is positioned and visible (the panel is portaled,
  // so Tab cannot reach it). Only once per opening: repositioning on scroll must not move focus.
  const focusedOnOpen = useRef(false);
  useEffect(() => {
    if (!open) { focusedOnOpen.current = false; return; }
    if (focusedOnOpen.current || placement.visibility !== "visible") return;
    focusedOnOpen.current = true;
    menuItems()[0]?.focus();
  }, [open, placement]);

  function menuItems() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  }

  function select(item: UiActionMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  }

  function menuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const enabled = menuItems();
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => { event.preventDefault(); enabled[(next + enabled.length) % enabled.length]?.focus(); };
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(enabled.length - 1);
    else if (event.key === "Tab") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return <span className="ui-action-menu">
    <button
      ref={triggerRef}
      type="button"
      className="ui-action-menu-trigger"
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={(event) => {
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        setOpen(true);
      }}
    >
      <EllipsisVertical size={18} />
    </button>
    {open && mounted ? createPortal(
      <div ref={menuRef} id={menuId} className="ui-action-menu-panel" role="menu" aria-label={ariaLabel} style={placement} onKeyDown={menuKeyDown}
        onClick={event => event.stopPropagation()}>
        {items.map((item) => <div key={item.key} className={item.separatorBefore ? "ui-action-menu-group-start" : undefined}>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            onClick={() => select(item)}
          >
            {item.icon ? <span className="ui-action-menu-icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        </div>)}
      </div>,
      document.body,
    ) : null}
  </span>;
}

export const UiTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { controlSize?: ControlSize }>(
  function UiTextarea({ className, controlSize = "default", ...props }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    useFieldLabelLink(textareaRef);
    return <textarea ref={(node) => { textareaRef.current = node; setRef(ref, node); }}
      className={controlClass("ui-control ui-textarea", controlSize, className)} {...props} />;
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

export type UiAutocompleteOption = { value: string; label: string; disabled?: boolean };

export function UiAutocomplete({
  value, onValueChange, options, loading = false, disabled = false, required = false,
  invalid = false, placeholder = "התחילו להקליד", emptyText = "לא נמצאו תוצאות.",
  loadingText = "טוען...", ariaLabel = "בחירה", maxLength, onClear, onOpenChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: UiAutocompleteOption[];
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  placeholder?: string;
  emptyText?: string;
  loadingText?: string;
  ariaLabel?: string;
  maxLength?: number;
  onClear?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [inputGeneration, setInputGeneration] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const suppressNextFocus = useRef(false);
  const menuId = useId();
  const { mounted, placement } = useFloatingMenu({
    open, setOpen, anchorRef: inputRef, menuRef, containerRef,
    desiredHeight: Math.min(260, Math.max(64, options.length * 40 + 14)),
  });

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  useEffect(() => { setActive(-1); }, [options]);
  useEffect(() => {
    if (!open || active < 0) return;
    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  useEffect(() => {
    if (inputGeneration) inputRef.current?.focus({ preventScroll: true });
  }, [inputGeneration]);

  function clearValidationState() {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    input.closest(".field-invalid")?.dispatchEvent(new Event("alpha:field-valid", { bubbles: true }));
  }

  function choose(option: UiAutocompleteOption) {
    if (option.disabled || loading) return;
    clearValidationState();
    onValueChange(option.label);
    setOpen(false);
    setActive(-1);
    // Remount clears native :user-invalid; restore keyboard focus without reopening the list.
    suppressNextFocus.current = true;
    setInputGeneration(generation => generation + 1);
  }

  function clear() {
    clearValidationState();
    onValueChange("");
    onClear?.();
    setOpen(true);
    setActive(-1);
    inputRef.current?.focus();
  }

  function keyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!loading) setActive(current => nextEnabledOption(options, current, event.key === "ArrowDown" ? 1 : -1));
    } else if ((event.key === "Home" || event.key === "End") && open) {
      event.preventDefault();
      if (!loading) setActive(nextEnabledOption(options, -1, event.key === "Home" ? 1 : -1));
    } else if (event.key === "Enter" && open && active >= 0) {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    }
  }

  return <div ref={containerRef} className="pension-fund-autocomplete">
    <div className="pension-fund-search">
      <UiInput key={inputGeneration} ref={inputRef} disabled={disabled} aria-required={required} aria-invalid={invalid}
        autoComplete="off" maxLength={maxLength} value={value} placeholder={placeholder} role="combobox"
        aria-label={ariaLabel} aria-autocomplete="list" aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? menuId : undefined}
        aria-activedescendant={open && !loading && options[active] ? menuId + "-option-" + active : undefined}
        onFocus={() => {
          if (suppressNextFocus.current) suppressNextFocus.current = false;
          else setOpen(true);
        }}
        onClick={() => setOpen(true)} onKeyDown={keyDown}
        onChange={event => { clearValidationState(); onValueChange(event.target.value); setOpen(true); }} />
      <div className="autocomplete-actions">
        {value && !disabled ? <button type="button" className="autocomplete-action autocomplete-clear" aria-label="ניקוי"
          onMouseDown={event => event.preventDefault()} onClick={clear}><X size={16} /></button> : null}
        <button type="button" className="autocomplete-action autocomplete-toggle" disabled={disabled}
          aria-label={open ? "סגירת רשימה" : "פתיחת רשימה"} aria-expanded={open && !disabled}
          onMouseDown={event => event.preventDefault()} onClick={() => setOpen(current => !current)}><ChevronDown size={17} /></button>
      </div>
    </div>
    {open && mounted && !disabled ? createPortal(
      <div ref={menuRef} id={menuId} className="pension-fund-options pension-fund-options-portal"
        onClick={event => event.stopPropagation()}
        role="listbox" aria-label={ariaLabel} aria-busy={loading} style={placement}>
        {loading ? <LoadingState compact label={loadingText} />
          : options.length === 0 ? <div className="pension-fund-empty">{emptyText}</div>
          : options.map((option, index) => <button type="button" key={option.value} id={menuId + "-option-" + index}
            role="option" aria-selected={index === active} disabled={option.disabled} tabIndex={-1}
            className={"pension-fund-option" + (index === active ? " selected" : "")}
            onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)}
            onClick={() => choose(option)}>{option.label}</button>)}
      </div>, document.body,
    ) : null}
  </div>;
}
