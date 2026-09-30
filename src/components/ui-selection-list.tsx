"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Check, CheckCheck, Search } from "lucide-react";
import { UiInput } from "@/components/ui-controls";

export type UiSelectionOption = {
  id: string;
  title: string;
  subtitle?: string;
  searchText?: string;
  disabled?: boolean;
  selectedByParent?: boolean;
};

export function UiSelectionList({
  title, description, options, selectedIds, onToggle,
  searchPlaceholder = "חיפוש ברשימה", emptyText = "לא נמצאו תוצאות",
  icon, disabled = false, height = 244,
}: {
  title: string;
  description?: string;
  options: UiSelectionOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  icon?: ReactNode;
  disabled?: boolean;
  height?: number;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("he");
    if (!term) return options;
    return options.filter(option =>
      `${option.title} ${option.subtitle ?? ""} ${option.searchText ?? ""}`.toLocaleLowerCase("he").includes(term));
  }, [options, search]);
  const count = options.filter(option => selected.has(option.id) || option.selectedByParent).length;
  return <section className="ui-selection" aria-labelledby={id}>
    <div className="ui-selection-heading">
      <div className="ui-selection-heading-copy">
        {icon ? <span className="ui-selection-heading-icon" aria-hidden="true">{icon}</span> : null}
        <div><h3 id={id}>{title}</h3>{description ? <p>{description}</p> : null}</div>
      </div>
      <span className="ui-selection-count" aria-live="polite">{count} נבחרו</span>
    </div>
    <div className="ui-selection-search">
      <Search size={17} aria-hidden="true" />
      <UiInput value={search} onChange={event => setSearch(event.target.value)}
        placeholder={searchPlaceholder} aria-label={`חיפוש: ${title}`} disabled={disabled} />
    </div>
    <div className="ui-selection-viewport" style={{ maxHeight: height }}
      role="group" aria-label={title}>
      {visible.length ? visible.map(option => {
        const isSelected = selected.has(option.id) || Boolean(option.selectedByParent);
        const isDisabled = disabled || Boolean(option.disabled) || Boolean(option.selectedByParent);
        return <button type="button" key={option.id} className={["ui-selection-item",
          isSelected ? "is-selected" : "", isDisabled ? "is-disabled" : "",
        ].filter(Boolean).join(" ")} aria-pressed={isSelected} disabled={isDisabled}
          onClick={() => onToggle(option.id)}>
          <span className="ui-selection-check" aria-hidden="true">{isSelected ? <Check size={14} /> : null}</span>
          <span className="ui-selection-item-copy"><strong>{option.title}</strong>
            {option.subtitle ? <small>{option.subtitle}</small> : null}
            {option.selectedByParent ? <small className="ui-selection-inherited">
              <CheckCheck size={13} aria-hidden="true" /> כלול בארגון שנבחר
            </small> : null}
          </span>
        </button>;
      }) : <div className="ui-selection-empty">{emptyText}</div>}
    </div>
    <div className="ui-selection-footer">
      <span>מציג {visible.length} מתוך {options.length}</span>
      {search ? <button className="ui-selection-reset" type="button" onClick={() => setSearch("")}>ניקוי חיפוש</button> : null}
    </div>
  </section>;
}
