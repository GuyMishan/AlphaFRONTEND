import type { EmployerSelection } from "@/lib/session/app-store";
import { collectPages } from "@/lib/api/paging";
import { manualDepositsApi } from "../deposits-api";
import { employerInterfaceApi } from "../employer-interface-api";
import { reportAttachmentsApi } from "../attachments-api";

/** Prevent advancing or transmitting a refund report with missing applicable 006 evidence. */
export async function validateRequiredReportDocuments(scope: EmployerSelection, reportId: string) {
  const { organizationId, employerId } = scope;
  const [deposits, attachments] = await Promise.all([
    collectPages(skip => manualDepositsApi.list(organizationId, employerId, reportId, "", skip, 100)),
    reportAttachmentsApi.list(organizationId, employerId, reportId),
  ]);
  const refundProducts = await Promise.all(deposits.map(async product => ({
    product,
    metadata: await employerInterfaceApi.productMetadata(organizationId, employerId, reportId, product.id),
  })));
  const missing: string[] = [];
  for (const { product, metadata } of refundProducts) {
    if (metadata.operationCode !== 5 || String(metadata.reportKind) === "1" || String(metadata.reportKind) === "Current") continue;
    const name = product.employeeName || product.fundName || "מוצר";
    if (metadata.collectiveAgreementRefund == null) {
      missing.push(`יש לבחור האם ההשבה עבור ${name} מתבצעת מכוח הסכם קיבוצי.`);
      continue;
    }
    const code = metadata.collectiveAgreementRefund ? 6 : 4;
    if (!attachments.items.some(item => item.documentTypeCode === code && item.reportProductId === product.id)) {
      missing.push(`חסר ${code === 6 ? "מסמך הצהרת מעסיק להסכם קיבוצי (6)" : "אישור עובד להשבת כספים (4)"} עבור ${name}.`);
    }
  }
  if (refundProducts.some(({ metadata }) => metadata.operationCode === 5) && !attachments.annualEmployerAffidavitSatisfied) {
    missing.push("חסר תצהיר מעסיק שנתי (קוד 3) להשבת כספים.");
  }
  if (missing.length) throw new Error(missing.join(" "));
}
