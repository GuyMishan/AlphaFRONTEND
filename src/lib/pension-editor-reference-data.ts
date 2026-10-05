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

export async function loadPensionEditorReferenceData(): Promise<PensionEditorReferenceData> {
  const headers = new Headers({ Accept: "application/json" });
  const response = await backendFetch("/api/reference-data/pension-editor-options", {
    headers,
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`טעינת אפשרויות עורך המוצרים נכשלה (${response.status})`);
  return response.json() as Promise<PensionEditorReferenceData>;
}
