import { getSession } from "./session";

export type CityOption = {
  cityCode: number;
  cityName: string;
  regionCode: number | null;
  regionName: string;
};

export type StreetOption = {
  streetCode: number;
  streetName: string;
  officialCode: number;
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

export const addressReferenceApi = {
  cities(search = "", take = 30) {
    const params = new URLSearchParams({ search, take: String(take) });
    return request<CityOption[]>(`/api/reference-data/cities?${params}`);
  },
  streets(cityCode: number, search = "", take = 40) {
    const params = new URLSearchParams({ cityCode: String(cityCode), search, take: String(take) });
    return request<StreetOption[]>(`/api/reference-data/streets?${params}`);
  },
};
