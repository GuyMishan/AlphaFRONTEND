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
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { createPortal } from "react-dom";
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
  const isMonth = mode === "month";
  const formatValue = (raw?: string | null) => {
    if (!raw) return "";
    if (isMonth) {
      const [year, month] = raw.slice(0, 7).split("-");
      return year && month ? `${month}/${year}` : "";
    }
    return formatDateDDMMYYYY(raw);
  };
  const [displayValue, setDisplayValue] = useState(() => formatValue(value));

  useEffect(() => { setDisplayValue(formatValue(value)); }, [value, mode]);

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
    if (disabled) return;
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return <div className={["ui-date-control", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
    <input {...props} type="text" inputMode="numeric" dir="ltr" disabled={disabled}
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
    {!disabled ? <>
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
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [placement, setPlacement] = useState<React.CSSProperties>({});
    const menuId = useId();
    const options = Children.toArray(children).filter(isValidElement).map((child) => {
      const optionProps = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      return { value: String(optionProps.value ?? ""), label: optionProps.children, disabled: Boolean(optionProps.disabled) };
    });
    const selectedValue = String(value ?? defaultValue ?? "");
    const selected = options.find((option) => option.value === selectedValue);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

    useEffect(() => {
      if (!open || !mounted) return;
      const positionMenu = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const gutter = 8;
        const availableBelow = window.innerHeight - rect.bottom - gutter * 2;
        const availableAbove = rect.top - gutter * 2;
        const desired = Math.min(260, Math.max(40, options.length * 40 + 14));
        const above = availableBelow < Math.min(desired, 170) && availableAbove > availableBelow;
        const available = above ? availableAbove : availableBelow;
        const maxHeight = Math.max(64, Math.min(desired, available));
        const top = above ? Math.max(gutter, rect.top - maxHeight - 6) : rect.bottom + 6;
        setPlacement({
          position: "fixed", top, left: rect.left, width: rect.width,
          maxHeight, zIndex: 6500,
        });
      };
      positionMenu();
      const onOutside = (event: PointerEvent) => {
        const target = event.target as Node;
        if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
      };
      const onEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setOpen(false);
          triggerRef.current?.focus();
          event.stopPropagation();
        }
      };
      document.addEventListener("pointerdown", onOutside);
      document.addEventListener("keydown", onEscape, true);
      window.addEventListener("resize", positionMenu);
      // A scrolled modal/table may move the trigger while the list is open.
      window.addEventListener("scroll", positionMenu, true);
      return () => {
        document.removeEventListener("pointerdown", onOutside);
        document.removeEventListener("keydown", onEscape, true);
        window.removeEventListener("resize", positionMenu);
        window.removeEventListener("scroll", positionMenu, true);
      };
    }, [open, mounted, options.length]);

    useEffect(() => {
      if (!open) return;
      const option = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[active];
      option?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    function assignRef(node: HTMLSelectElement | null) {
      nativeRef.current = node;
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
      const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
      if (!enabled.length) return;
      const current = enabled.indexOf(active);
      const next = current < 0 ? (direction > 0 ? 0 : enabled.length - 1) :
        (current + direction + enabled.length) % enabled.length;
      setActive(enabled[next]);
    }
    const keyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) setOpen(true);
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" || event.key === " ") {
        if (open && active >= 0 && !options[active].disabled) {
          event.preventDefault(); choose(options[active].value);
        }
      } else if (event.key === "Home" && open) {
        event.preventDefault(); setActive(options.findIndex(option => !option.disabled));
      } else if (event.key === "End" && open) {
        event.preventDefault(); setActive(options.findLastIndex(option => !option.disabled));
      }
    };

    return <div className={["ui-select", open ? "is-open" : "", disabled ? "is-disabled" : "", className].filter(Boolean).join(" ")}>
      <select ref={assignRef} value={value} defaultValue={value === undefined ? defaultValue : undefined} disabled={disabled} onChange={onChange}
        className="ui-select-native" tabIndex={-1} aria-hidden="true" {...props}>{children}</select>
      <button ref={triggerRef} type="button" className={controlClass("ui-control ui-select-trigger", controlSize)} disabled={disabled}
        aria-haspopup="listbox" aria-controls={open ? menuId : undefined} aria-expanded={open} onKeyDown={keyDown}
        onClick={() => {
          setActive(Math.max(0, options.findIndex(option => option.value === selectedValue && !option.disabled)));
          setOpen(current => !current);
        }}>
        <span>{selected?.label ?? ""}</span><ChevronDown size={17} />
      </button>
      {open && mounted && !disabled ? createPortal(
        <div ref={menuRef} id={menuId} className="ui-select-menu ui-select-menu-portal" role="listbox" style={placement}
          aria-label={props["aria-label"]}>
          {options.map((option, index) => <button key={option.value} type="button" role="option"
            aria-selected={option.value === selectedValue} tabIndex={-1}
            disabled={option.disabled} className={option.value === selectedValue || active === index ? "selected" : ""}
            onMouseEnter={() => setActive(index)} onClick={() => choose(option.value)}>{option.label}</button>)}
        </div>, document.body,
      ) : null}
    </div>;
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

export type UiAutocompleteOption = { value: string; label: string; disabled?: boolean };
export function UiAutocomplete({value,onValueChange,options,loading=false,disabled=false,required=false,invalid=false,placeholder="התחילו להקליד",emptyText="לא נמצאו תוצאות.",loadingText="טוען...",ariaLabel="בחירה",maxLength,onClear}:{value:string;onValueChange:(value:string)=>void;options:UiAutocompleteOption[];loading?:boolean;disabled?:boolean;required?:boolean;invalid?:boolean;placeholder?:string;emptyText?:string;loadingText?:string;ariaLabel?:string;maxLength?:number;onClear?:()=>void}) {
 const [open,setOpen]=useState(false); const [active,setActive]=useState(-1); const [inputGeneration,setInputGeneration]=useState(0); const inputRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{setActive(-1)},[options,open]);
 function clearValidationState(){const input=inputRef.current;if(!input)return;input.setCustomValidity("");input.removeAttribute("aria-invalid");input.closest(".field-invalid")?.dispatchEvent(new Event("alpha:field-valid",{bubbles:true}))}
 function choose(option:UiAutocompleteOption){
  if(option.disabled)return;
  clearValidationState();
  onValueChange(option.label);
  setOpen(false);
  setActive(-1);
  // Browsers can retain :user-invalid after a required autocomplete was submitted empty.
  // Remounting the native input clears that interaction state once a valid option is selected.
  setInputGeneration((generation)=>generation+1);
 }
 function clear(){clearValidationState();onValueChange("");onClear?.();setOpen(true);setActive(-1);requestAnimationFrame(()=>inputRef.current?.focus())}
 function keyDown(e:React.KeyboardEvent<HTMLInputElement>){if(e.key==="ArrowDown"){e.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,options.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();setActive(i=>Math.max(i-1,0))}else if(e.key==="Enter"&&open&&active>=0){e.preventDefault();choose(options[active])}else if(e.key==="Escape"){setOpen(false)}}
 return <div className="pension-fund-autocomplete" onBlur={e=>{const n=e.relatedTarget as Node|null;if(!n||!e.currentTarget.contains(n))setOpen(false)}}>
  <div className="pension-fund-search"><UiInput key={inputGeneration} ref={inputRef} disabled={disabled} aria-required={required} aria-invalid={invalid} autoComplete="off" maxLength={maxLength} value={value} placeholder={placeholder} role="combobox" aria-label={ariaLabel} aria-autocomplete="list" aria-expanded={open} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onKeyDown={keyDown} onChange={e=>{clearValidationState();onValueChange(e.target.value);setOpen(true)}}/>
   <div className="autocomplete-actions">{value&&!disabled?<button type="button" className="autocomplete-action autocomplete-clear" aria-label="ניקוי" onMouseDown={e=>e.preventDefault()} onClick={clear}><X size={16}/></button>:null}<button type="button" className="autocomplete-action autocomplete-toggle" disabled={disabled} aria-label={open?"סגירת רשימה":"פתיחת רשימה"} aria-expanded={open} onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(v=>!v)}><ChevronDown size={17}/></button></div>
  </div>
  {open&&!disabled?<div className="pension-fund-options" role="listbox" aria-busy={loading}>{loading?<div className="pension-fund-loading" role="status">{loadingText}</div>:options.length===0?<div className="pension-fund-empty">{emptyText}</div>:options.map((o,i)=><button type="button" key={o.value} role="option" aria-selected={i===active} disabled={o.disabled} className={`pension-fund-option${i===active?" selected":""}`} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>choose(o)}>{o.label}</button>)}</div>:null}
 </div>
}
