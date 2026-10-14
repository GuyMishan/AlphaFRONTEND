"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type AppTabItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: LucideIcon;
};

const tabId = (id: string, key: string) => `${id}-tab-${key}`;
const panelId = (id: string) => `${id}-panel`;

/**
 * Segmented tabs. Pass the same `id` to `AppTabPanel` so each tab controls the panel and the
 * panel is labelled by the active tab. Only the selected tab is in the Tab sequence; arrows
 * follow the RTL visual order, Home/End select the first/last tab.
 */
export function AppTabs<T extends string>({
  id,
  items,
  activeKey,
  onChange,
  ariaLabel,
}: {
  id?: string;
  items: AppTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // On narrow screens the list scrolls: keep the selected tab visible (deep links, taps, keys).
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !selected || list.scrollWidth <= list.clientWidth) return;
    const listBox = list.getBoundingClientRect();
    const tabBox = selected.getBoundingClientRect();
    if (tabBox.left < listBox.left) list.scrollBy({ left: tabBox.left - listBox.left - 8 });
    else if (tabBox.right > listBox.right) list.scrollBy({ left: tabBox.right - listBox.right + 8 });
  }, [activeKey]);

  return (
    <div ref={listRef} className="app-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map(({ key, label, icon: Icon }) => {
        const selected = activeKey === key;
        return (
          <button
            key={key}
            id={id ? tabId(id, key) : undefined}
            type="button"
            role="tab"
            tabIndex={selected ? 0 : -1}
            aria-selected={selected}
            aria-controls={id && selected ? panelId(id) : undefined}
            className={`app-tab${selected ? " active" : ""}`}
            onClick={() => { if (!selected) onChange(key); }}
            onKeyDown={(event) => {
              const index = items.findIndex(item => item.key === key);
              // Hebrew tabs run from right to left; arrows follow the visual order.
              const next = event.key === "ArrowLeft" ? (index + 1) % items.length
                : event.key === "ArrowRight" ? (index - 1 + items.length) % items.length
                : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              onChange(items[next].key);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
            }}
          >
            {Icon ? <Icon size={17} aria-hidden="true" /> : null}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The content of the selected tab. Re-keyed per tab, so switching fades the new content in. */
export function AppTabPanel({ id, activeKey, children }: { id: string; activeKey: string; children: ReactNode }) {
  return (
    <div key={activeKey} id={panelId(id)} role="tabpanel" aria-labelledby={tabId(id, activeKey)} className="app-tab-panel">
      {children}
    </div>
  );
}
