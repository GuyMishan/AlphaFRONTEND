import { getSession } from "./session";

export type EmployerInterfaceValidation = { isValid: boolean; interfaceType?: string | null; version?: string | null; issues: string[]; fileName?: string; fileHash?: string };
export type EmployerInterfaceImport = { reportId: string; importedEmployees: number; unmatchedRows: number; validation: EmployerInterfaceValidation; fileName: string; fileHash: string };

function headers() { const session = getSession(); const h = new Headers({ Accept: "application/json" }); if (session?.accessToken) h.set("Authorization", `Bearer ${session.accessToken}`); if (session?.mode === "development" && session.userId) { h.set("X-Alpha-User-Id", session.userId); if (session.platformAdmin) h.set("X-Alpha-Platform-Admin", "true"); } return h; }
async function upload<T>(organizationId: string, employerId: string, action: "validate" | "import", file: File, fileType: string) { const body = new FormData(); body.append("file", file); body.append("fileType", fileType); const response = await fetch(`/api/backend/api/organizations/${organizationId}/employers/${employerId}/employer-interface/${action}`, { method: "POST", headers: headers(), body }); if (!response.ok) { let message = `שגיאת שרת (${response.status})`; try { const p = await response.json(); message = p?.error ?? p?.detail ?? p?.validation?.issues?.join(" ") ?? message; } catch {} throw new Error(message); } return response.json() as Promise<T>; }
export const employerInterfaceApi = {
  validate: (organizationId: string, employerId: string, file: File, fileType: string) => upload<EmployerInterfaceValidation>(organizationId, employerId, "validate", file, fileType),
  importXml: (organizationId: string, employerId: string, file: File) => upload<EmployerInterfaceImport>(organizationId, employerId, "import", file, "employer-interface"),
  downloadUrl: (organizationId: string, employerId: string, reportId: string) => `/api/backend/api/organizations/${organizationId}/employers/${employerId}/employer-interface/reports/${reportId}/xml`,
};
