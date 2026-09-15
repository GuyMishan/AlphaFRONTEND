import type { ManualProductInput, PensionProductType } from "./types";

export function isIsraeliId(value: string) {
  if (!/^\d{1,9}$/.test(value)) return false;
  const id = value.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const n = Number(id[i]) * (i % 2 === 0 ? 1 : 2);
    sum += n > 9 ? n - 9 : n;
  }
  return sum % 10 === 0;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function validateEmployeeInput(input: { nationalId: string; firstName: string; lastName: string; employeeNumber: string; startDate: string }) {
  const errors: string[] = [];
  if (input.firstName.trim().length < 2) errors.push("שם פרטי הוא שדה חובה ולפחות 2 תווים.");
  if (input.lastName.trim().length < 2) errors.push("שם משפחה הוא שדה חובה ולפחות 2 תווים.");
  if (!isIsraeliId(input.nationalId.trim())) errors.push("תעודת הזהות אינה תקינה.");
  if (!input.employeeNumber.trim()) errors.push("מספר עובד הוא שדה חובה.");
  if (!input.startDate) errors.push("תאריך תחילת עבודה הוא שדה חובה.");
  else {
    const start = new Date(`${input.startDate}T00:00:00`);
    const min = new Date("1950-01-01T00:00:00");
    const max = new Date(); max.setFullYear(max.getFullYear() + 1);
    if (Number.isNaN(start.getTime()) || start < min || start > max) errors.push("תאריך תחילת העבודה אינו הגיוני.");
  }
  return errors;
}

export function validateEmployerInput(input: { legalName: string; registrationNumber: string; withholdingFileNumber: string }) {
  const errors: string[] = [];
  if (input.legalName.trim().length < 2) errors.push("שם משפטי מלא הוא שדה חובה ולפחות 2 תווים.");
  if (!/^\d{5,15}$/.test(input.registrationNumber.trim())) errors.push("מספר חברה / עוסק חייב להכיל 5-15 ספרות.");
  if (!/^\d{5,15}$/.test(input.withholdingFileNumber.trim())) errors.push("מספר תיק ניכויים חייב להכיל 5-15 ספרות.");
  return errors;
}

function maxPercentage(productType: PensionProductType, party: "employer" | "employee", component: number) {
  if (component === 4) return 100;
  if (party === "employer") {
    if (component === 1) return 8.33;
    if (component === 2) return 7.5;
    if (component === 3) return 2.5;
  }
  if (party === "employee" && component === 2) return productType === 2 ? 2.5 : 7;
  return 100;
}

const componentName: Record<number, string> = { 1: "פיצויים", 2: "תגמולים", 3: "אכ״ע", 4: "שונות" };

export function validateProducts(products: ManualProductInput[]) {
  const errors: string[] = [];
  if (!products.length) return ["יש להגדיר לפחות מוצר פנסיוני אחד לעובד."];

  const policyKeys = new Set<string>();
  products.forEach((product, index) => {
    const prefix = `מוצר ${index + 1}: `;
    const policy = product.policyNumber.trim();
    if (!policy) errors.push(prefix + "מספר פוליסה הוא שדה חובה.");
    const key = `${product.productType}:${policy.toLowerCase()}`;
    if (policy && policyKeys.has(key)) errors.push(prefix + "אותה פוליסה כבר קיימת אצל העובד.");
    policyKeys.add(key);
    if (!product.salaryMonth || !/^\d{4}-\d{2}/.test(product.salaryMonth)) errors.push(prefix + "חודש שכר הוא שדה חובה.");
    if (!Number.isFinite(product.salary) || product.salary <= 0) errors.push(prefix + "השכר חייב להיות גדול מאפס.");
    if (product.salary > 10_000_000) errors.push(prefix + "השכר חורג מהטווח המותר.");
    if (!product.reportingType.trim()) errors.push(prefix + "סוג דיווח הוא שדה חובה.");
    if (!product.salaryLayer.trim()) errors.push(prefix + "רובד שכר הוא שדה חובה.");
    if (product.section14 && !product.section14StartDate) errors.push(prefix + "יש להזין תאריך תחילת סעיף 14.");

    (["employerContributions", "employeeContributions"] as const).forEach((partyKey) => {
      const party = partyKey === "employerContributions" ? "employer" : "employee";
      const side = party === "employer" ? "מעסיק" : "עובד";
      product[partyKey].forEach((item) => {
        if (![item.amount, item.percentage, item.exemptPayments].every(Number.isFinite)) errors.push(prefix + `יש ערך מספרי לא תקין בהפקדות ${side}.`);
        if (item.amount < 0 || item.percentage < 0 || item.exemptPayments < 0) errors.push(prefix + `ערכי הפקדת ${side} לא יכולים להיות שליליים.`);
        const max = maxPercentage(product.productType, party, item.component);
        if (item.percentage > max) errors.push(prefix + `אחוז ${componentName[item.component]} של ${side} חורג מהמקסימום (${max}%).`);
        if (item.exemptPayments > item.amount) errors.push(prefix + `תשלומים פטורים של ${side} לא יכולים להיות גבוהים מסכום ההפקדה.`);
        if (item.amount > product.salary) errors.push(prefix + `סכום ${componentName[item.component]} של ${side} לא יכול להיות גבוה מהשכר.`);
      });
    });
  });
  return Array.from(new Set(errors));
}

export function validatePayment(input: {
  providerName: string;
  providerAccount: string;
  paymentMethod: string;
  valueDate: string | null;
  referenceNumber: string;
  employerBankCode: string;
  employerBranch: string;
  employerAccount: string;
}) {
  const errors: string[] = [];
  if (!input.providerName.trim()) errors.push("שם יצרן / מוצר הוא שדה חובה.");
  if (!input.providerAccount.trim()) errors.push("חשבון יצרן לזיכוי הוא שדה חובה.");
  if (!input.paymentMethod.trim()) errors.push("אופן התשלום הוא שדה חובה.");
  if (["העברה בנקאית", "מס״ב"].includes(input.paymentMethod)) {
    if (!input.valueDate) errors.push("תאריך ערך הוא שדה חובה.");
    if (!input.referenceNumber.trim()) errors.push("מספר אסמכתא הוא שדה חובה.");
    if (!/^\d+$/.test(input.employerBankCode.trim())) errors.push("מספר בנק חייב להכיל ספרות בלבד.");
    if (!/^\d+$/.test(input.employerBranch.trim())) errors.push("מספר סניף חייב להכיל ספרות בלבד.");
    if (!/^\d+$/.test(input.employerAccount.trim())) errors.push("מספר חשבון חייב להכיל ספרות בלבד.");
  }
  return errors;
}
