"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSession } from "@/lib/session";
import { userPreferencesApi, type AppearancePreference } from "@/lib/user-preferences-api";

type ThemeContextValue = {
  appearance: AppearancePreference;
  resolvedTheme: "light" | "dark";
  loading: boolean;
  saving: boolean;
  setAppearance: (appearance: AppearancePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: AppearancePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function cacheKey() {
  const session = getSession();
  return `alpha-appearance:${session?.userId ?? session?.displayName ?? "anonymous"}`;
}

function applyTheme(preference: AppearancePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.appearance = preference;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      setResolvedTheme(applyTheme("system"));
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem(cacheKey()) as AppearancePreference | null;
    if (cached === "system" || cached === "light" || cached === "dark") {
      setAppearanceState(cached);
      setResolvedTheme(applyTheme(cached));
    } else {
      setResolvedTheme(applyTheme("system"));
    }

    if (session.mode === "demo") {
      setLoading(false);
      return;
    }

    userPreferencesApi.get()
      .then((preferences) => {
        setAppearanceState(preferences.appearance);
        localStorage.setItem(cacheKey(), preferences.appearance);
        setResolvedTheme(applyTheme(preferences.appearance));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (appearance !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolvedTheme(applyTheme("system"));
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [appearance]);

  async function setAppearance(next: AppearancePreference) {
    setSaving(true);
    setAppearanceState(next);
    localStorage.setItem(cacheKey(), next);
    setResolvedTheme(applyTheme(next));
    try {
      if (getSession()?.mode !== "demo") await userPreferencesApi.setAppearance(next);
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  }

  const value = useMemo(() => ({ appearance, resolvedTheme, loading, saving, setAppearance }), [appearance, resolvedTheme, loading, saving]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppearance() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppearance must be used inside ThemeProvider");
  return value;
}
