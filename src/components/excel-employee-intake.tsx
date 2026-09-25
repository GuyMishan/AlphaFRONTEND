"use client";

import { UiDateInput, UiInput } from "@/components/ui-controls";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, UploadCloud, UserPlus } from "lucide-react";
import * as XLSX from "xlsx";
import { alphaApi } from "@/lib/api";
import { isValidEmail } from "@/lib/validation";
import type { EmployerInterfaceProductMetadataInput } from "@/lib/employer-interface-api";
import type { ManualPaymentInput } from "@/lib/manual-deposits-api";
import type {
  ContributionComponent,
  Employee,
  EmployeeInput,
  ManualContributionInput,
  ManualProductInput,
  PensionProductType,
  SalaryAllocationType,
  Section14Code,
} from "@/lib/types";

export type ExcelReportRow = {
  rowNumber: number;
  nationalId: string;
  employeeNumber: string;
  product: ManualProductInput;
  metadata: EmployerInterfaceProductMetadataInput;
  payment: ManualPaymentInput;
};

export type ExcelEmployeeIntakeResult = {
  fileName: string;
  matchedEmploymentIds: string[];
  matchedEmployees: { employmentId: string; input: EmployeeInput }[];
  newEmployees: EmployeeInput[];
  blockedCount: number;
  totalRows: number;
  reportRows: ExcelReportRow[];
  updateEmployeeProfiles: boolean;
  updatePensionMix: boolean;
};

type Props = {
  organizationId: string;
  employerId: string;
  reportingMonth: string;
  onChange: (result: ExcelEmployeeIntakeResult | null) => void;
};

type IntakeRow = EmployeeInput & {
  rowNumber: number;
  status: "matched" | "new" | "blocked";
  employmentId?: string;
  reason?: string;
  selected: boolean;
  reportRow?: ExcelReportRow;
};

const employeeAliases = {
  nationalId: ["תז", "תעודתזהות", "מספרזהות", "nationalid", "id", "identity"],
  firstName: ["שםפרטי", "firstname", "first"],
  lastName: ["שםמשפחה", "lastname", "last", "surname"],
  fullName: ["שםעובד", "שםמלא", "employeename", "fullname", "name"],
  employeeNumber: ["מספרעובד", "מסעובד", "employeenumber", "employeeno", "employeeid"],
  startDate: ["תאריךתחילתעבודה", "תחילתעבודה", "תאריךקליטה", "startdate", "employmentstartdate"],
  monthlySalary: ["שכרחודשי", "שכר", "monthlysalary", "salary"],
  birthDate: ["תאריךלידה", "תלידה", "birthdate", "dateofbirth", "dob"],
  gender: ["מין", "מגדר", "gender", "sex"],
  email: ["אימייל", "דואל", "דואר101אלקטרוני", "email", "emailaddress"],
  mobile: ["נייד", "טלפוןנייד", "סלולרי", "mobile", "mobilephone", "cellphone"],
  city: ["ישוב", "יישוב", "עיר", "city", "town"],
  street: ["רחוב", "street", "streetname"],
  houseNumber: ["מספרבית", "מסבית", "house", "housenumber", "streetnumber"],
  apartment: ["דירה", "מספרדירה", "מסדירה", "apartment", "apartmentnumber", "apt"],
  postalCode: ["מיקוד", "zipcode", "postalcode", "postcode"],
  postOfficeBox: ["תאדואר", "תד", "pobox", "postofficebox"],
};

const reportAliases = {
  productType: ["סוגמוצר", "סוגקופה", "producttype", "fundtype"],
  fundCode: ["קודקופה", "מספרקופה", "fundcode", "providercode"],
  fundName: ["שםקופה", "שםמוצר", "fundname", "productname"],
  fundCompanyName: ["חברהמנהלת", "יצרן", "fundcompany", "providername"],
  fundClassification: ["סיווגקופה", "fundclassification"],
  policyNumber: ["מספרפוליסה", "מספרחשבון", "policynumber", "accountnumber"],
  insuredSalary: ["שכרמבוטח", "insuredsalary", "reportedsalary"],
  salaryMonth: ["חודששכר", "salarymonth", "reportingmonth"],
  reportingType: ["סוגתקבול", "sugtakbul", "receipttype"],
  salaryLayer: ["רובדשכר", "salarylayer"],
  section14Code: ["סעיף14", "קודסעיף14", "section14", "section14code"],
  section14Date: ["תאריךסעיף14", "section14date"],
  allocationType: ["שיטתהקצאתשכר", "allocationtype"],
  allocationValue: ["ערךהקצאתשכר", "allocationvalue"],
  operationCode: ["סוגפעולה", "operationcode"],
  depositStatus: ["מעמדהפקדה", "depositstatus"],
  employeeStatus: ["סטטוסעובד", "employeestatus"],
  statusStartDate: ["תאריךתחילתסטטוס", "statusstartdate"],
  employmentPercentage: ["חלקיותמשרה", "employmentpercentage"],
  workDaysInMonth: ["ימיעבודה", "workdays"],
  lastDeposit: ["הפקדהאחרונה", "lastdeposit"],
  refundReason: ["סיבתהחזר", "refundreason"],
  paymentMethodCode: ["אמצעיתשלום", "paymentmethod", "paymentmethodcode"],
  employerAccountType: ["סוגחשבוןמעסיק", "employeraccounttype"],
  receiverAccountType: ["סוגחשבוןקולט", "receiveraccounttype"],
  oldPensionTypeCode: ["סוגקרןותיקה", "oldpensiontype"],
  previousIdentifier: ["מזההקודם", "previousidentifier"],
  previousClearingIdentifier: ["מזההמסלקהקודם", "previousclearingidentifier"],
  previousReferenceExceptionCode: ["חריגמזההקודם", "previousreferenceexception"],
  providerAccount: ["חשבוןיצרן", "provideraccount", "receiveraccount"],
  valueDate: ["תאריךערךהפקדה", "valuedate"],
  trustAccountValueDate: ["תאריךערךנאמנות", "trustaccountvaluedate"],
  actualDepositAmount: ["סכוםהפקדהנוספת", "actualdepositamount"],
  masavSenderCode: ["קודמסב", "masavcode", "masavsendercode"],
  referenceNumber: ["אסמכתא", "מספראסמכתא", "referencenumber"],
  employerBankName: ["שםבנקמעסיק", "employerbankname"],
  employerBankCode: ["מספרבנקמעסיק", "employerbankcode"],
  employerBranch: ["סניףמעסיק", "employerbranch"],
  employerAccount: ["חשבוןמעסיק", "employeraccount"],
};

const contributionAliases: Record<string, string[]> = {
  erSeverancePct: ["אחוזפיצוייםמעסיק", "employerseverancepct"],
  erSeveranceAmount: ["סכוםפיצוייםמעסיק", "employerseveranceamount"],
  erSeveranceExempt: ["פטורפיצוייםמעסיק", "employerseveranceexempt"],
  erBenefitsPct: ["אחוזתגמוליםמעסיק", "employerbenefitspct"],
  erBenefitsAmount: ["סכוםתגמוליםמעסיק", "employerbenefitsamount"],
  erBenefitsExempt: ["פטורתגמוליםמעסיק", "employerbenefitsexempt"],
  erDisabilityPct: ["אחוזאכעמעסיק", "employerdisabilitypct"],
  erDisabilityAmount: ["סכוםאכעמעסיק", "employerdisabilityamount"],
  erDisabilityExempt: ["פטוראכעמעסיק", "employerdisabilityexempt"],
  erOtherPct: ["אחוזשונותמעסיק", "employerotherpct"],
  erOtherAmount: ["סכוםשונותמעסיק", "employerotheramount"],
  erOtherExempt: ["פטורשונותמעסיק", "employerotherexempt"],
  eeBenefitsPct: ["אחוזתגמוליםעובד", "אחוזתג45", "employeebenefitspct"],
  eeBenefitsAmount: ["סכוםתגמוליםעובד", "סכוםתג45", "employeebenefitsamount"],
  eeBenefitsExempt: ["פטורתגמוליםעובד", "employeebenefitsexempt"],
  ee47Pct: ["אחוזתג47", "employee47pct"],
  ee47Amount: ["סכוםתג47", "employee47amount"],
  ee47Exempt: ["פטורתג47", "employee47exempt"],
  eeDisabilityPct: ["אחוזאכעעובד", "employeedisabilitypct"],
  eeDisabilityAmount: ["סכוםאכעעובד", "employeedisabilityamount"],
  eeDisabilityExempt: ["פטוראכעעובד", "employeedisabilityexempt"],
  eeOtherPct: ["אחוזשונותעובד", "employeeotherpct"],
  eeOtherAmount: ["סכוםשונותעובד", "employeeotheramount"],
  eeOtherExempt: ["פטורשונותעובד", "employeeotherexempt"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_\-.\/"'׳״:()]+/g, "");
}

function pick(row: Record<string, unknown>, names: string[]) {
  const wanted = new Set(names.map(normalizeHeader));
  const key = Object.keys(row).find((item) => wanted.has(normalizeHeader(item)));
  return key ? String(row[key] ?? "").trim() : "";
}

function digits(value: string) { return value.replace(/\D/g, ""); }
function numeric(value: string, fallback = 0) {
  const normalized = value.replace(/,/g, "").replace(/%/g, "").trim();
  if (!normalized) return fallback;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : Number.NaN;
}
function integer(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(/\D/g, ""));
  return Number.isInteger(n) ? n : null;
}

function parseDate(value: string) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const monthOnly = value.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (monthOnly) return `${monthOnly[1]}-${monthOnly[2].padStart(2, "0")}-01`;
  const local = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (local) {
    const year = local[3].length === 2 ? `20${local[3]}` : local[3];
    return `${year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseGender(value: string): number | null {
  const normalized = normalizeHeader(value);
  if (["1", "זכר", "male", "m"].includes(normalized)) return 1;
  if (["2", "נקבה", "female", "f"].includes(normalized)) return 2;
  return null;
}

function parseProductType(value: string): PensionProductType | null {
  const v = normalizeHeader(value);
  if (["1", "קרןפנסיה", "פנסיה", "pension", "pensionfund"].includes(v)) return 1;
  if (["2", "קרןהשתלמות", "השתלמות", "studyfund"].includes(v)) return 2;
  if (["3", "ביטוחמנהלים", "מנהלים", "managersinsurance"].includes(v)) return 3;
  if (["4", "קופתגמל", "גמל", "providentfund"].includes(v)) return 4;
  return null;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function contribution(raw: Record<string, unknown>, component: ContributionComponent, prefix: string): ManualContributionInput | null {
  const pct = numeric(pick(raw, contributionAliases[`${prefix}Pct`] ?? []), 0);
  const amount = numeric(pick(raw, contributionAliases[`${prefix}Amount`] ?? []), 0);
  const exemptPayments = numeric(pick(raw, contributionAliases[`${prefix}Exempt`] ?? []), 0);
  if (![pct, amount, exemptPayments].every(Number.isFinite)) return null;
  if (pct === 0 && amount === 0 && exemptPayments === 0) return null;
  return { component, percentage: pct, amount, exemptPayments };
}

function parseReportRow(raw: Record<string, unknown>, rowNumber: number, nationalId: string, employeeNumber: string, reportingMonth: string, allocationOrder: number): { row?: ExcelReportRow; errors: string[] } {
  const errors: string[] = [];
  const productType = parseProductType(pick(raw, reportAliases.productType));
  const fundCode = digits(pick(raw, reportAliases.fundCode));
  const fundName = pick(raw, reportAliases.fundName);
  const policyNumber = pick(raw, reportAliases.policyNumber);
  const salary = numeric(pick(raw, reportAliases.insuredSalary), Number.NaN);
  const salaryMonth = parseDate(pick(raw, reportAliases.salaryMonth)) || `${reportingMonth}-01`;
  const reportingType = pick(raw, reportAliases.reportingType);
  const salaryLayer = pick(raw, reportAliases.salaryLayer);
  const section14Code = integer(pick(raw, reportAliases.section14Code)) as Section14Code | null;
  const section14StartDate = parseDate(pick(raw, reportAliases.section14Date)) || null;
  const allocationTypeRaw = integer(pick(raw, reportAliases.allocationType));
  const allocationType = (allocationTypeRaw ?? 1) as SalaryAllocationType;
  const allocationValueRaw = numeric(pick(raw, reportAliases.allocationValue), Number.NaN);
  const allocationValue = Number.isFinite(allocationValueRaw) ? allocationValueRaw : salary;

  if (!productType) errors.push("סוג מוצר");
  if (!fundCode) errors.push("קוד קופה");
  if (!Number.isFinite(salary) || salary < 0) errors.push("שכר מבוטח");
  if (!reportingType || !/^\d+$/.test(reportingType)) errors.push("סוג תקבול");
  if (!salaryLayer || !/^\d+$/.test(salaryLayer)) errors.push("רובד שכר");
  if (!section14Code || ![1, 2, 3, 4, 5].includes(section14Code)) errors.push("סעיף 14");
  if ((section14Code === 2 || section14Code === 4) && !section14StartDate) errors.push("תאריך סעיף 14");

  const employerContributions = [
    contribution(raw, 1, "erSeverance"),
    contribution(raw, 2, "erBenefits"),
    contribution(raw, 3, "erDisability"),
    contribution(raw, 4, "erOther"),
  ].filter(Boolean) as ManualContributionInput[];
  const employeeContributions = [
    contribution(raw, 1, "eeBenefits"),
    contribution(raw, 2, "ee47"),
    contribution(raw, 3, "eeDisability"),
    contribution(raw, 4, "eeOther"),
  ].filter(Boolean) as ManualContributionInput[];
  if (!employerContributions.length && !employeeContributions.length) errors.push("הפרשות עובד/מעסיק");

  if (errors.length || !productType || !section14Code) return { errors };

  const metadata: EmployerInterfaceProductMetadataInput = {
    operationCode: integer(pick(raw, reportAliases.operationCode)),
    depositStatus: integer(pick(raw, reportAliases.depositStatus)),
    employeeStatus: integer(pick(raw, reportAliases.employeeStatus)),
    statusStartDate: parseDate(pick(raw, reportAliases.statusStartDate)) || null,
    employmentPercentage: (() => { const n = numeric(pick(raw, reportAliases.employmentPercentage), Number.NaN); return Number.isFinite(n) ? n : null; })(),
    workDaysInMonth: integer(pick(raw, reportAliases.workDaysInMonth)),
    lastDeposit: integer(pick(raw, reportAliases.lastDeposit)),
    refundReason: integer(pick(raw, reportAliases.refundReason)),
    paymentMethodCode: integer(pick(raw, reportAliases.paymentMethodCode)),
    employerAccountType: integer(pick(raw, reportAliases.employerAccountType)),
    receiverAccountType: integer(pick(raw, reportAliases.receiverAccountType)),
    oldPensionTypeCode: integer(pick(raw, reportAliases.oldPensionTypeCode)),
    previousIdentifier: pick(raw, reportAliases.previousIdentifier),
    previousClearingIdentifier: pick(raw, reportAliases.previousClearingIdentifier),
    previousReferenceExceptionCode: integer(pick(raw, reportAliases.previousReferenceExceptionCode)),
  };

  const payment: ManualPaymentInput = {
    providerName: pick(raw, reportAliases.fundCompanyName) || fundName,
    providerAccount: pick(raw, reportAliases.providerAccount),
    paymentMethod: metadata.paymentMethodCode == null ? "" : String(metadata.paymentMethodCode),
    valueDate: parseDate(pick(raw, reportAliases.valueDate)) || null,
    trustAccountValueDate: parseDate(pick(raw, reportAliases.trustAccountValueDate)) || null,
    actualDepositAmount: (() => { const n = numeric(pick(raw, reportAliases.actualDepositAmount), Number.NaN); return Number.isFinite(n) ? n : null; })(),
    masavSenderCode: pick(raw, reportAliases.masavSenderCode),
    referenceNumber: pick(raw, reportAliases.referenceNumber),
    employerBankName: pick(raw, reportAliases.employerBankName),
    employerBankCode: digits(pick(raw, reportAliases.employerBankCode)),
    employerBranch: digits(pick(raw, reportAliases.employerBranch)),
    employerAccount: digits(pick(raw, reportAliases.employerAccount)),
    confirmationFileName: "",
  };

  return {
    errors: [],
    row: {
      rowNumber,
      nationalId,
      employeeNumber,
      product: {
        productType,
        policyNumber,
        fundExternalKey: fundCode,
        fundCode,
        fundName,
        fundCompanyName: pick(raw, reportAliases.fundCompanyName),
        fundClassification: pick(raw, reportAliases.fundClassification),
        salaryMonth,
        salary,
        salaryAllocationType: allocationType,
        salaryAllocationValue: allocationType === 4 ? null : allocationValue,
        allocationOrder,
        reportingType,
        salaryLayer,
        section14: section14Code === 1 || section14Code === 2,
        section14Code,
        section14StartDate,
        employerContributions,
        employeeContributions,
      },
      metadata,
      payment,
    },
  };
}

async function loadAllEmployees(organizationId: string, employerId: string) {
  const result: Employee[] = [];
  let skip = 0;
  let hasMore = true;
  while (hasMore && result.length < 5000) {
    const page = await alphaApi.employeeSearch(organizationId, employerId, "", skip, 100);
    result.push(...page.items);
    hasMore = page.hasMore;
    skip += page.items.length;
    if (!page.items.length) break;
  }
  return result;
}

export function ExcelEmployeeIntake({ organizationId, employerId, reportingMonth, onChange }: Props) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [defaultStartDate, setDefaultStartDate] = useState(`${reportingMonth}-01`);
  const [updateEmployeeProfiles, setUpdateEmployeeProfiles] = useState(false);
  const [updatePensionMix, setUpdatePensionMix] = useState(false);

  useEffect(() => { setDefaultStartDate(`${reportingMonth}-01`); }, [reportingMonth]);

  const matched = useMemo(() => {
    const byEmployment = new Map<string, IntakeRow>();
    rows.filter((x) => x.status === "matched" && x.employmentId).forEach((x) => byEmployment.set(x.employmentId!, x));
    return [...byEmployment.values()];
  }, [rows]);
  const newRows = useMemo(() => {
    const byNationalId = new Map<string, IntakeRow>();
    rows.filter((x) => x.status === "new").forEach((x) => { if (!byNationalId.has(x.nationalId)) byNationalId.set(x.nationalId, x); });
    return [...byNationalId.values()];
  }, [rows]);
  const blocked = useMemo(() => rows.filter((x) => x.status === "blocked"), [rows]);

  useEffect(() => {
    if (!fileName || !rows.length) { onChange(null); return; }
    onChange({
      fileName,
      matchedEmploymentIds: matched.map((x) => x.employmentId!).filter(Boolean),
      matchedEmployees: matched.map((x) => ({
        employmentId: x.employmentId!,
        input: {
          nationalId: x.nationalId, firstName: x.firstName, lastName: x.lastName, employeeNumber: x.employeeNumber,
          startDate: x.startDate, monthlySalary: x.monthlySalary, birthDate: x.birthDate, gender: x.gender,
          email: x.email, mobile: x.mobile, city: x.city, street: x.street, houseNumber: x.houseNumber,
          apartment: x.apartment, postalCode: x.postalCode, postOfficeBox: x.postOfficeBox,
        },
      })),
      newEmployees: newRows.filter((x) => x.selected).map(({ rowNumber: _rowNumber, status: _status, employmentId: _employmentId, reason: _reason, selected: _selected, reportRow: _reportRow, ...employee }) => employee),
      blockedCount: blocked.length,
      totalRows: rows.length,
      reportRows: rows.filter((x) => x.status !== "blocked" && x.reportRow).map((x) => x.reportRow!),
      updateEmployeeProfiles,
      updatePensionMix,
    });
  }, [fileName, rows, matched, newRows, blocked, updateEmployeeProfiles, updatePensionMix, onChange]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setRows([]); onChange(null);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setError("יש לבחור קובץ Excel או CSV בלבד."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("הקובץ גדול מדי. הגודל המרבי הוא 20MB."); return; }
    setLoading(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("לא נמצא גיליון בקובץ.");
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!rawRows.length) throw new Error("הקובץ ריק או שלא נמצאו בו שורות נתונים.");
      if (rawRows.length > 5000) throw new Error("ניתן לקלוט עד 5,000 שורות דיווח בקובץ אחד.");

      const existing = await loadAllEmployees(organizationId, employerId);
      const byNationalId = new Map(existing.map((x) => [digits(x.nationalId), x]));
      const byEmployeeNumber = new Map(existing.map((x) => [x.employeeNumber.trim().toLowerCase(), x]));
      const identityByNationalId = new Map<string, string>();
      const productOrderByEmployee = new Map<string, number>();

      const parsed: IntakeRow[] = rawRows.map((raw, index) => {
        let firstName = pick(raw, employeeAliases.firstName);
        let lastName = pick(raw, employeeAliases.lastName);
        const fullName = pick(raw, employeeAliases.fullName);
        if ((!firstName || !lastName) && fullName) {
          const split = splitName(fullName);
          firstName ||= split.firstName;
          lastName ||= split.lastName;
        }

        const nationalId = digits(pick(raw, employeeAliases.nationalId)).slice(0, 9);
        const employeeNumber = pick(raw, employeeAliases.employeeNumber);
        const startDate = parseDate(pick(raw, employeeAliases.startDate)) || defaultStartDate;
        const monthlySalary = numeric(pick(raw, employeeAliases.monthlySalary), 0);
        const birthDate = parseDate(pick(raw, employeeAliases.birthDate)) || null;
        const gender = parseGender(pick(raw, employeeAliases.gender));
        const email = pick(raw, employeeAliases.email).trim();
        const mobile = digits(pick(raw, employeeAliases.mobile));
        const city = pick(raw, employeeAliases.city).trim();
        const street = pick(raw, employeeAliases.street).trim();
        const houseNumber = pick(raw, employeeAliases.houseNumber).trim();
        const apartment = pick(raw, employeeAliases.apartment).trim();
        const postalCode = digits(pick(raw, employeeAliases.postalCode));
        const postOfficeBox = digits(pick(raw, employeeAliases.postOfficeBox));

        const base: Omit<IntakeRow, "status" | "selected" | "reason" | "employmentId" | "reportRow"> = {
          rowNumber: index + 2, nationalId, firstName, lastName, employeeNumber, startDate, monthlySalary,
          birthDate, gender, email, mobile, city, street, houseNumber, apartment, postalCode, postOfficeBox,
        };

        const missing: string[] = [];
        if (!nationalId) missing.push("ת״ז");
        if (!firstName) missing.push("שם פרטי");
        if (!lastName) missing.push("שם משפחה");
        if (!employeeNumber) missing.push("מספר עובד");
        if (!birthDate) missing.push("תאריך לידה");
        if (!gender) missing.push("מין (1/זכר או 2/נקבה)");
        if (!email || !isValidEmail(email) || email.length > 50) missing.push("אימייל תקין");
        if (!/^\d{7,15}$/.test(mobile)) missing.push("נייד 7-15 ספרות");
        const hasPostOfficeBox = Boolean(postOfficeBox);
        const hasStreetAddress = Boolean(city && street && houseNumber && postalCode);
        if (!hasPostOfficeBox && !hasStreetAddress) missing.push("כתובת מלאה או תא דואר");
        if (!Number.isFinite(monthlySalary) || monthlySalary < 0) missing.push("שכר חודשי תקין");

        const identitySignature = [employeeNumber.trim().toLowerCase(), firstName.trim(), lastName.trim()].join("|");
        const existingIdentity = identityByNationalId.get(nationalId);
        if (existingIdentity && existingIdentity !== identitySignature)
          missing.push("פרטי עובד לא עקביים בין שורות הקובץ");
        else if (nationalId) identityByNationalId.set(nationalId, identitySignature);

        const order = productOrderByEmployee.get(nationalId) ?? 0;
        const report = parseReportRow(raw, index + 2, nationalId, employeeNumber, reportingMonth, order);
        productOrderByEmployee.set(nationalId, order + 1);
        missing.push(...report.errors.map((x) => `דיווח: ${x}`));

        if (missing.length)
          return { ...base, status: "blocked" as const, reason: `חסרים/לא תקינים: ${missing.join(", ")}`, selected: false };

        const employeeKey = employeeNumber.trim().toLowerCase();
        const nationalMatch = byNationalId.get(nationalId);
        const numberMatch = byEmployeeNumber.get(employeeKey);
        if (nationalMatch && numberMatch && nationalMatch.id === numberMatch.id)
          return { ...base, status: "matched" as const, employmentId: nationalMatch.id, selected: true, reportRow: report.row };
        if (nationalMatch || numberMatch)
          return { ...base, status: "blocked" as const, reason: nationalMatch && numberMatch ? "ת״ז ומספר עובד שייכים לעובדים שונים" : "נמצאה התאמה חלקית לעובד קיים — נדרשת בדיקה", selected: false };
        return { ...base, status: "new" as const, selected: true, reportRow: report.row };
      });

      setFileName(file.name);
      setRows(parsed);
      if (parsed.some((x) => x.status === "new")) {
        setUpdateEmployeeProfiles(false);
        setUpdatePensionMix(false);
      }
    } catch (err) {
      setFileName("");
      setRows([]);
      setError(err instanceof Error ? err.message : "קריאת הקובץ נכשלה");
    } finally { setLoading(false); }
  }

  function toggleNew(nationalId: string) {
    setRows((current) => current.map((row) => row.nationalId === nationalId && row.status === "new"
      ? { ...row, selected: !current.find((x) => x.nationalId === nationalId && x.status === "new")?.selected } : row));
  }

  return <>
    <div className="card-head"><div><h2>העלאת קובץ דיווח מלא</h2><span style={{ color: "var(--muted)" }}>Excel / CSV · עובדים, מוצרים, הפרשות ונתוני ממשק מעסיקים 006</span></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}
    <label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>כל שורה מייצגת מוצר פנסיוני של עובד. המערכת קולטת את פרטי העובד, הקופה, שכר מבוטח, הפרשות, סעיף 14, סטטוסים, סוג פעולה ופרטי תשלום. לעובד עם כמה מוצרים יש כמה שורות.</p><span className="btn btn-soft">{loading ? "קורא ובודק קובץ..." : "בחירת קובץ"}</span><UiInput id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden disabled={loading} onChange={(event) => void selectFile(event)} /></label>

    {rows.length ? <div style={{ marginTop: 20 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        <div className="notice notice-info"><CircleCheck size={17} /> {matched.length} עובדים קיימים הותאמו</div>
        <div className="notice notice-info"><UserPlus size={17} /> {newRows.length} עובדים חדשים זוהו</div>
        <div className={blocked.length ? "notice notice-error" : "notice notice-info"}><CircleAlert size={17} /> {blocked.length} שורות דורשות טיפול</div>
      </div>

      {newRows.length ? <div className="notice notice-info" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
        <b>זוהו {newRows.length} עובדים חדשים. הם יוקמו כדי להיכלל בדיווח.</b>
        <span>בנוסף לדיווח הנוכחי, האם לעדכן מה־Excel גם מידע קבוע בכרטיסי העובדים ובתמהיל הפנסיוני?</span>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><UiInput type="checkbox" checked={updateEmployeeProfiles} onChange={(e) => setUpdateEmployeeProfiles(e.target.checked)} />עדכן גם את פרטי העובדים הקיימים בכרטיס העובד</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><UiInput type="checkbox" checked={updatePensionMix} onChange={(e) => setUpdatePensionMix(e.target.checked)} />עדכן גם את התמהיל הפנסיוני בכרטיסי העובדים לפי הקובץ</label>
      </div> : null}

      <div className="field" style={{ maxWidth: 300, marginBottom: 16 }}><label>תאריך תחילת עבודה ברירת מחדל לעובד חדש</label><UiDateInput value={defaultStartDate} onValueChange={setDefaultStartDate} /></div>
      {blocked.length ? <div className="notice notice-error" style={{ marginBottom: 16 }}><b>לא ניתן להמשיך כל עוד קיימות שורות חסומות.</b> תקנו את הקובץ והעלו אותו מחדש. בכל שורה מוצגת הסיבה המדויקת.</div> : null}
      <div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>שורה</th><th>סטטוס</th><th>ת״ז</th><th>שם</th><th>מספר עובד</th><th>מוצר</th><th>פעולה / שגיאה</th></tr></thead><tbody>{rows.slice(0, 250).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.status === "matched" ? "עובד קיים" : row.status === "new" ? "עובד חדש" : "חסום"}</td><td>{row.nationalId || "—"}</td><td>{`${row.firstName} ${row.lastName}`.trim() || "—"}</td><td>{row.employeeNumber || "—"}</td><td>{row.reportRow?.product.fundName || row.reportRow?.product.fundCode || "—"}</td><td>{row.status === "new" ? <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><UiInput type="checkbox" checked={row.selected} onChange={() => toggleNew(row.nationalId)} />להקים ולהכליל</label> : row.reason ?? "ייכלל בדיווח"}</td></tr>)}</tbody></table></div>
      {rows.length > 250 ? <div className="notice notice-info" style={{ marginTop: 12 }}>מוצגות 250 השורות הראשונות מתוך {rows.length}. כל השורות נבדקו וייכללו בעיבוד.</div> : null}
    </div> : null}
  </>;
}
