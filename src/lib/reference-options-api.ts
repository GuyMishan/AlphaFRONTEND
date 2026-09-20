import { getSession } from "./session";

export type ReferenceOption = {
  value: string;
  label: string;
  scope: string;
};

async function request<T>(path: string): Promise<T> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`אירעה שגיאה (${response.status})`);
  return response.json() as Promise<T>;
}

export const referenceOptionsApi = {
  list: (category: string, scope = "all") => {
    const params = new URLSearchParams({ category, scope });
    return request<ReferenceOption[]>(`/api/reference-data/options?${params}`);
  },
};
