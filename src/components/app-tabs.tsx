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
          aria-selected={activeKey === key}
          className={`app-tab${activeKey === key ? " active" : ""}`}
          onClick={() => onChange(key)}
        >
          {Icon ? <Icon size={17} aria-hidden="true" /> : null}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
