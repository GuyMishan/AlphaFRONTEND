import { backendFetch } from "./backend-fetch";

export type PensionEditorReferenceOption = {
  value: string;
  label: string;
  scope: string;
};

export type PensionEditorInterfaceOption = {
  code: number;
  name: string;
  scope: string;
};

export type PensionEditorSalaryLayer = {
  code: number;
  name: string;
};

export type PensionEditorReferenceData = {
  referenceOptions: Record<string, PensionEditorReferenceOption[]>;
  interfaceOptions: Record<string, PensionEditorInterfaceOption[]>;
  salaryLayers: PensionEditorSalaryLayer[];
};

let bundlePromise: Promise<PensionEditorReferenceData> | null = null;
let bundleCache: PensionEditorReferenceData | null = null;

export function getPensionEditorReferenceData(force = false): Promise<PensionEditorReferenceData> {
  if (force) {
    bundlePromise = null;
    bundleCache = null;
  }
  if (bundleCache) return Promise.resolve(bundleCache);
  if (!bundlePromise) {
    const headers = new Headers({ Accept: "application/json" });
    bundlePromise = backendFetch("/api/reference-data/pension-editor-options", { headers, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`טעינת אפשרויות עורך המוצרים נכשלה (${response.status})`);
        return response.json() as Promise<PensionEditorReferenceData>;
      })
      .then((data) => {
        bundleCache = data;
        return data;
      })
      .finally(() => {
        bundlePromise = null;
      });
  }
  return bundlePromise;
}

export function invalidatePensionEditorReferenceData() {
  bundlePromise = null;
  bundleCache = null;
}
