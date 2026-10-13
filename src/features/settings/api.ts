import { apiRequest } from "@/lib/api/client";

export type AppearancePreference = "system" | "light" | "dark";
export type UserPreferences = { appearance: AppearancePreference };

const fallbackMessage = "טעינת הגדרות המשתמש נכשלה";

export const userPreferencesApi = {
  get: () => apiRequest<UserPreferences>("/api/me/preferences", { fallbackMessage }),
  setAppearance: (appearance: AppearancePreference) =>
    apiRequest<UserPreferences>("/api/me/preferences/appearance", { method: "PUT", body: { appearance }, fallbackMessage }),
};
