"use client";

import type { LucideIcon } from "lucide-react";

export type AppTabItem<T extends string = string> = {
  key: T;
  label: string;
  icon?: LucideIcon;
};

export function AppTabs<T extends string>({
  items,
  activeKey,
  onChange,
  ariaLabel,
}: {
  items: AppTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="app-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          tabIndex={activeKey === key ? 0 : -1}
          aria-selected={activeKey === key}
          className={`app-tab${activeKey === key ? " active" : ""}`}
          onClick={() => onChange(key)}
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
      ))}
    </div>
  );
}
