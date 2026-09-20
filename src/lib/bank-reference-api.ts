import { getSession } from "./session";

export type BankReference = {
  bankCode: number;
  bankName: string;
};

export type BankBranchReference = {
  branchCode: number;
  branchName: string;
  branchAddress: string;
  city: string;
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

export const bankReferenceApi = {
  banks: (search = "", take = 100) => {
    const params = new URLSearchParams({ search, take: String(take) });
    return request<BankReference[]>(`/api/reference-data/banks?${params}`);
  },
  branches: (bankCode: number, search = "", take = 200) => {
    const params = new URLSearchParams({ bankCode: String(bankCode), search, take: String(take) });
    return request<BankBranchReference[]>(`/api/reference-data/bank-branches?${params}`);
  },
};
