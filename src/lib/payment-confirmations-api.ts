import { backendFetch } from "@/lib/backend-fetch";

export type PaymentConfirmation = {
  id: string; originalFileName: string; contentType: string; sizeBytes: number; sha256: string; createdAt: string;
};
const path = (organizationId: string, employerId: string, reportId: string, productId: string) =>
  `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/payment-confirmations/${productId}`;
async function errorMessage(response: Response) {
  if (response.status === 503) return "שמירת מסמכים אינה זמינה כרגע. יש לבדוק הגדרת אחסון וסריקת אבטחה.";
  return `שמירת המסמך נכשלה (${response.status}).`;
}
export const paymentConfirmationsApi = {
  async list(org: string, employer: string, report: string, product: string) {
    const response = await backendFetch(path(org, employer, report, product), { cache: "no-store" });
    if (!response.ok) throw new Error(await errorMessage(response));
    return (await response.json() as { items: PaymentConfirmation[] }).items;
  },
  async upload(org: string, employer: string, report: string, product: string, file: File) {
    const body = new FormData(); body.set("file", file);
    const response = await backendFetch(path(org, employer, report, product), { method: "POST", body });
    if (!response.ok) throw new Error(await errorMessage(response));
    return response.json() as Promise<PaymentConfirmation>;
  },
  async download(org: string, employer: string, report: string, product: string, evidence: PaymentConfirmation) {
    const response = await backendFetch(`${path(org, employer, report, product)}/${evidence.id}/file`);
    if (!response.ok) throw new Error("הורדת האסמכתא נכשלה.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = evidence.originalFileName;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
