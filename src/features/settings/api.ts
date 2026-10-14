import { apiRequest } from "@/lib/api/client";

export type AppearancePreference = "system" | "light" | "dark";
export type UserPreferences = { appearance: AppearancePreference };

export const userPreferencesApi = {
  get: () => apiRequest<UserPreferences>("/api/me/preferences", { fallbackMessage: "טעינת הגדרות המשתמש נכשלה" }),
  setAppearance: (appearance: AppearancePreference) =>
    apiRequest<UserPreferences>("/api/me/preferences/appearance", { method: "PUT", body: { appearance }, fallbackMessage: "שמירת הגדרת התצוגה נכשלה" }),
};
