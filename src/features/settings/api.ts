import { apiRequest } from "@/lib/api/client";

export type AppearancePreference = "system" | "light" | "dark";
export type UserPreferences = { appearance: AppearancePreference; marketingEmailOptIn: boolean };

export const userPreferencesApi = {
  get: () => apiRequest<UserPreferences>("/api/me/preferences", { fallbackMessage: "טעינת הגדרות המשתמש נכשלה" }),
  setMarketing: (marketingEmailOptIn: boolean) => apiRequest<{ marketingEmailOptIn: boolean }>(
    "/api/me/preferences/marketing", { method: "PUT", body: { marketingEmailOptIn } }),
  setAppearance: (appearance: AppearancePreference) =>
    apiRequest<UserPreferences>("/api/me/preferences/appearance", { method: "PUT", body: { appearance }, fallbackMessage: "שמירת הגדרת התצוגה נכשלה" }),
};
