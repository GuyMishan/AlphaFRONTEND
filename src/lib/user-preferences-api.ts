import { getSession } from "./session";

export type AppearancePreference = "system" | "light" | "dark";
export type UserPreferences = { appearance: AppearancePreference };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  if (session?.mode === "demo") return { appearance: "system" } as T;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`טעינת הגדרות המשתמש נכשלה (${response.status})`);
  return response.json() as Promise<T>;
}

export const userPreferencesApi = {
  get: () => request<UserPreferences>("/api/me/preferences/"),
  setAppearance: (appearance: AppearancePreference) => request<UserPreferences>("/api/me/preferences/appearance", {
    method: "PUT",
    body: JSON.stringify({ appearance }),
  }),
};
