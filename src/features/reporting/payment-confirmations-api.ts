import { apiBlob, apiRequest } from "@/lib/api/client";
import { saveBlob } from "@/lib/download";

export type PaymentConfirmation = {
  reportProductId?: string;
  id: string; originalFileName: string; contentType: string; sizeBytes: number; sha256: string; createdAt: string;
};

const path = (organizationId: string, employerId: string, reportId: string, productId: string) =>
  `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/payment-confirmations/${productId}`;

const messages = { SERVICE_UNAVAILABLE: "שמירת מסמכים אינה זמינה כרגע. יש לבדוק הגדרת אחסון וסריקת אבטחה." };
const fallbackMessage = "שמירת המסמך נכשלה.";

export const paymentConfirmationsApi = {
  async listForReport(org: string, employer: string, report: string): Promise<(PaymentConfirmation & { reportProductId: string })[]> {
    const base = path(org, employer, report, "").replace(/\/$/, "");
    const result = await apiRequest<{ items: (PaymentConfirmation & { reportProductId: string })[] }>(base, { messages, fallbackMessage });
    return result.items;
  },
  async list(org: string, employer: string, report: string, product: string) {
    const result = await apiRequest<{ items: PaymentConfirmation[] }>(path(org, employer, report, product), { messages, fallbackMessage });
    return result.items;
  },
  upload(org: string, employer: string, report: string, product: string, file: File) {
    const body = new FormData(); body.set("file", file);
    return apiRequest<PaymentConfirmation>(path(org, employer, report, product), { method: "POST", body, messages, fallbackMessage });
  },
  async download(org: string, employer: string, report: string, product: string, evidence: PaymentConfirmation) {
    const blob = await apiBlob(`${path(org, employer, report, product)}/${evidence.id}/file`, {
      messages: { SERVICE_UNAVAILABLE: "הורדת האסמכתא נכשלה." },
      fallbackMessage: "הורדת האסמכתא נכשלה.",
    });
    saveBlob(blob, evidence.originalFileName);
  },
};
