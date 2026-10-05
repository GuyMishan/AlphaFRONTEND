import { backendFetch } from "./backend-fetch";

export type ReferenceOption = {
  value: string;
  label: string;
  scope: string;
};

async function request<T>(path: string): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const response = await backendFetch(path, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`אירעה שגיאה (${response.status})`);
  return response.json() as Promise<T>;
}

export const referenceOptionsApi = {
  list: (category: string, scope = "all") => {
    const params = new URLSearchParams({ category, scope });
    return request<ReferenceOption[]>(`/api/reference-data/options?${params}`);
  },
};
