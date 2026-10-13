import { apiRequest, queryString } from "@/lib/api/client";
import type { PensionFundOption, PensionProductType } from "@/features/pension/types";
import type { BankBranchOption, BankOption } from "@/features/reference-data/types";
import type { CityOption, PensionEditorReferenceData, ReferenceOption, SalaryLayerOption, StreetOption } from "./types";

const base = "/api/reference-data";

/** Read-only catalogs shared by many forms (banks, addresses, funds, option lists). */
export const referenceDataApi = {
  banks: (search = "", take = 100) =>
    apiRequest<BankOption[]>(`${base}/banks${queryString({ search, take })}`),
  bankBranches: (bankCode: number, search = "", take = 200) =>
    apiRequest<BankBranchOption[]>(`${base}/bank-branches${queryString({ bankCode, search, take })}`),
  pensionFunds: (productType: PensionProductType, search = "", take = 500) =>
    apiRequest<PensionFundOption[]>(`${base}/pension-funds${queryString({ productType, search, take })}`),
  cities: (search = "", take = 30) =>
    apiRequest<CityOption[]>(`${base}/cities?${new URLSearchParams({ search, take: String(take) })}`),
  streets: (cityCode: number, search = "", take = 40) =>
    apiRequest<StreetOption[]>(`${base}/streets?${new URLSearchParams({ cityCode: String(cityCode), search, take: String(take) })}`),
  options: (category: string, scope = "all") =>
    apiRequest<ReferenceOption[]>(`${base}/options?${new URLSearchParams({ category, scope })}`),
  salaryLayers: () =>
    apiRequest<SalaryLayerOption[]>(`${base}/salary-layers`, { fallbackMessage: "טעינת רובדי השכר נכשלה" }),
  pensionEditorOptions: () =>
    apiRequest<PensionEditorReferenceData>(`${base}/pension-editor-options`, { fallbackMessage: "טעינת אפשרויות עורך המוצרים נכשלה" }),
};
