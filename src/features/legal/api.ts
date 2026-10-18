import { apiRequest } from "@/lib/api/client";

export type LegalDocument = {
  id: string;
  version: number;
  title: string;
  markdown: string;
  status: string;
  publishedAt: string;
  effectiveAt: string;
  requiresReacceptance: boolean;
};

export const legalApi = {
  active: (signal?: AbortSignal) => apiRequest<LegalDocument>("/api/legal-document/active", { anonymous: true, signal }),
};
