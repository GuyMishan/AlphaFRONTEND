import { type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadata, type EmployerInterfaceProductMetadataInput } from "@/features/reporting/employer-interface-api";
import { type ManualDepositContributionLimit, type ManualDepositRow, type ManualPaymentInput } from "@/features/reporting/deposits-api";
import { calculateContributionAmount, roundMoney } from "@/features/pension/contribution-math";

export function isNegativeKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) { return value === 3 || value === "3" || value === "Negative"; }
export function isDifferencesKind(value: EmployerInterfaceProductMetadata["reportKind"] | null | undefined) { return value === 2 || value === "2" || value === "Differences"; }
export function isGuidV4(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim()); }
export function requiresPreviousReference(negative: boolean, operationCode: number | null) { return negative ? operationCode === 5 || operationCode === 6 : operationCode === 2 || operationCode === 3 || operationCode === 7; }
export function validate006Metadata(metadata: EmployerInterfaceProductMetadata | null, form: EmployerInterfaceProductMetadataInput, previous: EmployerInterfacePreviousReference) {
  const errors: string[] = [];
  if (!metadata) return ["נתוני הדיווח עדיין נטענים."];
  if (isDifferencesKind(metadata.reportKind)) return errors;
  const negative = isNegativeKind(metadata.reportKind);
  if (!form.operationCode) errors.push("סוג פעולה הוא שדה חובה.");
  if (!negative) {
    if (!form.depositStatus) errors.push("מעמד הפקדה בקופה הוא שדה חובה בדיווח שוטף.");
    if (!form.employeeStatus) errors.push("סטטוס עובד בחודש השכר הוא שדה חובה בדיווח שוטף.");
    if (!form.statusStartDate) errors.push("תאריך תחילת סטטוס הוא שדה חובה בדיווח שוטף.");
    if (!form.lastDeposit) errors.push("יש לציין האם זו הפקדה אחרונה בדיווח שוטף.");
    if (!form.paymentMethodCode) errors.push("אמצעי תשלום הוא שדה חובה בדיווח שוטף.");
    if (!form.employerAccountType) errors.push("סוג חשבון מעסיק הוא שדה חובה בדיווח שוטף.");
    if (!form.receiverAccountType) errors.push("סוג חשבון קולט תשלום הוא שדה חובה בדיווח שוטף.");
    if ((form.operationCode === 2 || form.operationCode === 7) && form.paymentMethodCode !== 1)
      errors.push("בקוד פעולה 2 או 7 יש להשתמש באמצעי תשלום 1.");
    if (form.operationCode === 7 && form.employerAccountType !== 1)
      errors.push("בקוד פעולה 7, כאשר אין העברת כסף, סוג חשבון המעסיק חייב להיות 1.");
    if (form.paymentMethodCode === 9 && (form.employerAccountType !== 1 || form.receiverAccountType !== 1))
      errors.push("באמצעי תשלום 9 סוג חשבון המעסיק וסוג החשבון הקולט חייבים להיות 1.");
  } else {
    if (!form.refundReason) errors.push("סיבת בקשה להחזר כספים היא שדה חובה בדיווח שלילי.");
    if (form.operationCode === 5 && !form.paymentMethodCode)
      errors.push("בקוד פעולה 5 יש לבחור את אופן החזר התשלום המבוקש.");
    if (form.operationCode === 6 && form.paymentMethodCode != null)
      errors.push("בקוד פעולה 6 אין להעביר אמצעי תשלום לפי ממשק מעסיקים 006.");
  }
  if (!negative && form.employmentPercentage != null && (form.employmentPercentage < 1 || form.employmentPercentage > 100)) errors.push("חלקיות משרה חייבת להיות בין 1 ל־100.");
  if (!negative && form.workDaysInMonth != null && (form.workDaysInMonth < 0 || form.workDaysInMonth > 31)) errors.push("ימי עבודה בחודש חייבים להיות בין 0 ל־31.");

  if (requiresPreviousReference(negative, form.operationCode)) {
    const hasIdentifier = Boolean(previous.previousIdentifier.trim());
    const hasClearingIdentifier = Boolean(previous.previousClearingIdentifier.trim());
    if (!hasIdentifier && !hasClearingIdentifier && !previous.previousReferenceExceptionCode)
      errors.push("יש לקשר לדיווח המקורי באמצעות מספר זיהוי קודם או מספר מסלקה קודם, או לבחור חריג רשמי.");
    if (hasIdentifier && !isGuidV4(previous.previousIdentifier)) errors.push("מספר זיהוי קודם חייב להיות GUID גרסה 4.");
    if (hasClearingIdentifier && !isGuidV4(previous.previousClearingIdentifier)) errors.push("מספר מסלקה קודם חייב להיות GUID גרסה 4.");
  }
  return errors;
}
export const noContributionEmployeeStatuses = new Set([3, 4, 5, 8, 9, 10, 11, 12, 17]);
export function validatePreventableContributionRules(
  row: ManualDepositRow,
  metadata: EmployerInterfaceProductMetadata | null,
  meta: EmployerInterfaceProductMetadataInput,
  limits: ManualDepositContributionLimit[],
) {
  const errors: string[] = [];
  if (!metadata || isNegativeKind(metadata.reportKind) || isDifferencesKind(metadata.reportKind)) return errors;
  if (!meta.depositStatus || noContributionEmployeeStatuses.has(Number(meta.employeeStatus))) return errors;

  // Deposit status 2 is עמית עצמאי. Regulation 19 employee/employer rules apply to
  // salaried deposits (including controlling shareholders), while independent deposits
  // follow the separate Regulation 19A/error-code family.
  if (meta.depositStatus === 2) return errors;

  const employeeBenefits = row.employeeContributions.filter((item) => Number(item.component) === 2);
  const employerBenefits = row.employerContributions.filter((item) => Number(item.component) === 2);
  const employerSeverance = row.employerContributions.filter((item) => Number(item.component) === 1);
  const employerDisability = row.employerContributions.filter((item) => Number(item.component) === 3);
  const sumAmount = (items: typeof row.employeeContributions) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const sumPct = (items: typeof row.employeeContributions) => items.filter((item) => Number(item.amount || 0) > 0)
    .reduce((sum, item) => sum + Number(item.percentage || 0), 0);

  const employeeBenefitsAmount = sumAmount(employeeBenefits);
  const employerBenefitsAmount = sumAmount(employerBenefits);
  const severanceAmount = sumAmount(employerSeverance);
  if (employeeBenefitsAmount > 0 && employerBenefitsAmount <= 0)
    errors.push("קוד שגיאה 16: לא ניתן להפקיד תגמולי עובד ללא תגמולי מעסיק.");
  if (employerBenefitsAmount > 0 && employeeBenefitsAmount <= 0)
    errors.push("קוד שגיאה 17: לא ניתן להפקיד תגמולי מעסיק ללא תגמולי עובד.");
  if (Number(row.productType) === 1 && severanceAmount > 0 && (employeeBenefitsAmount <= 0 || employerBenefitsAmount <= 0))
    errors.push("קוד שגיאה 23: בקרן פנסיה לא ניתן להפקיד פיצויים ללא תגמולי עובד ותגמולי מעסיק.");

  const salary = Number(row.salary || 0);
  const allRows = [
    ...row.employerContributions.map((item) => ({ ...item, party: 1 })),
    ...row.employeeContributions.map((item) => ({ ...item, party: 2 })),
  ];
  for (const item of allRows) {
    const amount = Number(item.amount || 0);
    const percentage = Number(item.percentage || 0);
    if (amount <= 0 && percentage <= 0) continue;
    if (salary > 0) {
      const expected = calculateContributionAmount(salary, percentage);
      if (amount <= 0 || percentage <= 0 || roundMoney(amount) !== expected) {
        errors.push("קוד שגיאה 53: אין התאמה בין אחוז ההפרשה, סכום ההפרשה והשכר.");
        break;
      }
    }

    const year = Number(String(row.salaryMonth || "").slice(0, 4));
    const limit = limits.find((entry) => entry.year === year
      && Number(entry.productType) === Number(row.productType)
      && Number(entry.party) === Number(item.party)
      && Number(entry.component) === Number(item.component));
    if (!limit) {
      errors.push(`קוד שגיאה 72: לא הוגדרה תקרת הפקדה רשמית לשנת ${year} עבור אחד מרכיבי ההפקדה.`);
      break;
    }
    if (percentage > Number(limit.maxPercentage)) {
      errors.push(`קוד שגיאה 72: אחוז ההפרשה ${percentage}% חורג מהתקרה הרשמית ${limit.maxPercentage}%.`);
      break;
    }
  }

  const employeeRate = sumPct(employeeBenefits);
  const employerRate = sumPct(employerBenefits);
  if (employeeRate > 0 && employerRate > 0 && employeeRate <= 5 && employerRate <= 5
      && Math.abs(employeeRate - employerRate) > 0.0001)
    errors.push("קוד שגיאה 71: תגמולי עובד ותגמולי מעסיק עד 5% מהשכר חייבים להיות זהים.");

  const disabilityRate = sumPct(employerDisability);
  if (employerRate + disabilityRate > 7.5 + 0.0001)
    errors.push("קוד שגיאה 72: תגמולי מעסיק ואכ״ע יחד לא יכולים לעבור 7.5% מהשכר.");

  const hasPositiveContribution = allRows.some((item) => Number(item.amount || 0) > 0);
  if (meta.depositStatus === 1 && String(row.reportingType) === "1" && hasPositiveContribution && salary <= 0)
    errors.push("קוד שגיאה 75: במעמד הפקדת שכיר ובתקבול שוטף חובה לדווח את השכר שממנו הועברו התשלומים.");

  return errors;
}
export function validatePaymentDetails(form: ManualPaymentInput, metadata: EmployerInterfaceProductMetadata | null, meta: EmployerInterfaceProductMetadataInput, totalDeposit: number) {
  const errors: string[] = [];
  if (!form.providerName.trim()) errors.push("לא נמצאו פרטי יצרן למוצר.");
  if (!metadata || isDifferencesKind(metadata.reportKind)) return errors;
  const negative = isNegativeKind(metadata.reportKind);
  const noMoneyCorrection = !negative && (meta.operationCode === 2 || meta.operationCode === 7);
  const receiverAccountRequired = !negative && !noMoneyCorrection && ((meta.paymentMethodCode === 1 && totalDeposit > 0) || meta.paymentMethodCode === 7);
  if (receiverAccountRequired && !form.providerAccount.trim()) errors.push("לא נמצא חשבון יצרן לזיכוי בנתוני המוצר.");
  const requireEmployerBank = (!negative && !noMoneyCorrection && (meta.paymentMethodCode === 1 || meta.paymentMethodCode === 7))
    || (meta.operationCode === 5 && meta.paymentMethodCode === 1);
  if (!negative && !noMoneyCorrection && totalDeposit > 0 && (meta.paymentMethodCode === 1 || meta.paymentMethodCode === 3) && !form.referenceNumber.trim())
    errors.push("מספר האסמכתא בפועל הוא שדה חובה באמצעי תשלום זה.");
  if (!negative && !noMoneyCorrection && meta.receiverAccountType === 1 && meta.paymentMethodCode !== 6 && meta.paymentMethodCode !== 9 && !form.valueDate)
    errors.push("תאריך ערך הפקדה לקופה הוא שדה חובה כאשר החשבון הקולט הוא חשבון יצרן.");
  if (!negative && !noMoneyCorrection
    && (meta.employerAccountType === 2 || meta.receiverAccountType === 2)
    && !form.trustAccountValueDate)
    errors.push("תאריך ערך הפקדה לחשבון נאמנות הוא שדה חובה בכל העברה אל חשבון נאמנות או ממנו.");
  if (!negative && meta.operationCode === 7 && Math.abs(totalDeposit) > 0.0001)
    errors.push("בקוד פעולה 7 מתקנים תשלומים פטורים בלבד; סכום ההפרשה הרגיל חייב להיות 0.");
  if (!negative && meta.operationCode === 3 && (form.actualDepositAmount == null || form.actualDepositAmount <= 0))
    errors.push("בקוד פעולה 3 יש להזין סכום הפקדה נוספת בפועל הגדול מאפס.");
  if (!negative && meta.paymentMethodCode === 7 && !/^.{8,16}$/.test(form.masavSenderCode.trim()))
    errors.push("בסליקה באמצעות מס״ב יש להזין קוד מס״ב פנימי באורך 8–16 תווים.");
  if (form.referenceNumber.length > 50) errors.push("מספר אסמכתא יכול להכיל עד 50 תווים לפי ממשק 006.");
  if (requireEmployerBank) {
    if (!/^\d+$/.test(form.employerBankCode.trim())) errors.push("יש לבחור בנק.");
    if (!/^\d{1,3}$/.test(form.employerBranch.trim())) errors.push("יש לבחור סניף.");
    if (!/^\d{1,20}$/.test(form.employerAccount.trim())) errors.push("יש להזין מספר חשבון תקין.");
  }
  return errors;
}
