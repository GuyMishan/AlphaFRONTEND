import { backendFetch } from "./backend-fetch";

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
  const headers = new Headers({ Accept: "application/json" });
  const response = await backendFetch(path, { headers, cache: "no-store" });
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
