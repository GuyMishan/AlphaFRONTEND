"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSession } from "@/lib/session/storage";
import { useAppStore } from "@/lib/session/use-app-store";
import { userPreferencesApi, type AppearancePreference } from "@/features/settings/api";
import { THEME_CACHE_PREFIX, THEME_LAST_KEY } from "@/features/settings/theme-init";

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

function isPreference(value: string | null): value is AppearancePreference {
  return value === "system" || value === "light" || value === "dark";
}

function cacheKey() {
  const session = getSession();
  return `${THEME_CACHE_PREFIX}${session?.userId ?? session?.displayName ?? "anonymous"}`;
}

/** Remembers the user's preference, and the device's last one for the pre-paint script (theme-init.ts). */
function rememberPreference(key: string, preference: AppearancePreference) {
  localStorage.setItem(key, preference);
  localStorage.setItem(THEME_LAST_KEY, preference);
}

function applyTheme(preference: AppearancePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.appearance = preference;
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Follows sign-in, session restore and sign-out without waiting for a navigation.
  const sessionUserKey = useAppStore((state) => state.session ? state.session.userId ?? state.session.displayName : null);
  const loadedUserKey = useRef<string | null>(null);
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    const userKey = session?.userId ?? session?.displayName ?? "anonymous";
    if (loadedUserKey.current === userKey) return;
    loadedUserKey.current = userKey;
    setLoading(true);

    // Same order as the pre-paint script, so this never flips the theme it already applied:
    // the user's cached preference, else the device's last one, else the OS setting.
    const key = cacheKey();
    const cached = session ? localStorage.getItem(key) : null;
    const lastUsed = localStorage.getItem(THEME_LAST_KEY);
    const initial = isPreference(cached) ? cached : isPreference(lastUsed) ? lastUsed : "system";
    setAppearanceState(initial);
    setResolvedTheme(applyTheme(initial));

    if (!session) {
      setLoading(false);
      return;
    }

    userPreferencesApi.get()
      .then((preferences) => {
        setAppearanceState(preferences.appearance);
        rememberPreference(key, preferences.appearance);
        setResolvedTheme(applyTheme(preferences.appearance));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [sessionUserKey]);

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
    rememberPreference(cacheKey(), next);
    setResolvedTheme(applyTheme(next));
    try {
      await userPreferencesApi.setAppearance(next);
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
