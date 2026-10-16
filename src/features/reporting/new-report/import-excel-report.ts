import { employeesApi } from "@/features/employees/api";
import type { Employee } from "@/features/employees/types";
import type { ExcelEmployeeIntakeResult } from "@/features/employees/components/excel-employee-intake";
import type { EmployeePensionProductInput } from "@/features/pension/types";
import type { EmployerSelection } from "@/lib/session/app-store";
import { collectPages } from "@/lib/api/paging";
import { manualReportsApi } from "../api";
import { manualDepositsApi } from "../deposits-api";
import { employerInterfaceApi } from "../employer-interface-api";

type ImportExcelReportOptions = {
  scope: EmployerSelection;
  intake: ExcelEmployeeIntakeResult;
  reportId: string;
  month: string;
  salaryPaymentDate: string;
  paymentAccountId: string;
  /** Keep a created draft available if a later row fails. */
  onReportCreated: (reportId: string) => void;
};
export async function importExcelReport({
  scope, intake: excelIntake, reportId: manualReportId, month, salaryPaymentDate,
  paymentAccountId: selectedPaymentAccountId, onReportCreated,
}: ImportExcelReportOptions) {
  if (!scope || !excelIntake) throw new Error("יש להעלות ולבדוק קובץ Excel לפני שממשיכים.");
  if (excelIntake.blockedCount) throw new Error("יש שורות חסומות בקובץ. תקנו את הקובץ והעלו אותו מחדש לפני המשך.");

  const created: Employee[] = [];
  const employmentByNationalId = new Map<string, string>();

  for (const matched of excelIntake.matchedEmployees) {
    employmentByNationalId.set(matched.input.nationalId.replace(/\D/g, ""), matched.employmentId);
    if (excelIntake.updateEmployeeProfiles)
      await employeesApi.updateEmployee(scope.organizationId, scope.employerId, matched.employmentId, matched.input);
  }

  for (const input of excelIntake.newEmployees) {
    const saved = await employeesApi.createEmployee(scope.organizationId, scope.employerId, input);
    employmentByNationalId.set(input.nationalId.replace(/\D/g, ""), saved.id);
    created.push({ id: saved.id, personId: saved.personId, ...input, status: 1, endDate: null });
  }

  const employmentIds = Array.from(new Set(employmentByNationalId.values()));
  if (!employmentIds.length) throw new Error("לא נמצאו עובדים תקינים להוספה לדיווח.");

  let reportId = manualReportId;
  if (!reportId) {
    const report = await manualReportsApi.createManualReport(scope.organizationId, scope.employerId, {
      reportingMonth: `${month}-01`,
      salaryPaymentDate,
      employmentIds,
      paymentAccountId: selectedPaymentAccountId,
    });
    reportId = report.id;
    onReportCreated(report.id);
  } else {
    await manualReportsApi.syncManualReportEmployees(scope.organizationId, scope.employerId, reportId, employmentIds);
  }

  const reportEmployees = await collectPages(skip =>
    manualReportsApi.manualReportEmployees(scope.organizationId, scope.employerId, reportId, "", skip, 100));
  const reportEmployeeByEmploymentId = new Map(reportEmployees.map((item) => [item.employmentId, item]));

  const rowsByEmploymentId = new Map<string, typeof excelIntake.reportRows>();
  for (const row of excelIntake.reportRows) {
    const employmentId = employmentByNationalId.get(row.nationalId.replace(/\D/g, ""));
    if (!employmentId) continue;
    const list = rowsByEmploymentId.get(employmentId) ?? [];
    list.push(row);
    rowsByEmploymentId.set(employmentId, list);
  }

  for (const [employmentId, rows] of rowsByEmploymentId) {
    const reportEmployee = reportEmployeeByEmploymentId.get(employmentId);
    if (!reportEmployee) throw new Error(`לא נמצא העובד ${employmentId} בתוך טיוטת הדיווח.`);
    const sorted = [...rows].sort((a, b) => Number(a.product.allocationOrder ?? 0) - Number(b.product.allocationOrder ?? 0));
    const employeeInput = excelIntake.matchedEmployees.find((x) => x.employmentId === employmentId)?.input
      ?? excelIntake.newEmployees.find((x) => employmentByNationalId.get(x.nationalId.replace(/\D/g, "")) === employmentId);
    const monthlySalary = employeeInput?.monthlySalary ?? Math.max(...sorted.map((x) => x.product.salary), 0);

    await manualReportsApi.saveManualReportEmployee(
      scope.organizationId, scope.employerId, reportId, reportEmployee.id, monthlySalary,
      sorted.map((x) => x.product),
      employeeInput,
    );

    const detail = await manualReportsApi.manualReportEmployee(scope.organizationId, scope.employerId, reportId, reportEmployee.id);
    for (const sourceRow of sorted) {
      const product = detail.products.find((item) => Number(item.allocationOrder ?? 0) === Number(sourceRow.product.allocationOrder ?? 0)
        && item.fundCode === sourceRow.product.fundCode
        && item.policyNumber === sourceRow.product.policyNumber)
        ?? detail.products.find((item) => Number(item.allocationOrder ?? 0) === Number(sourceRow.product.allocationOrder ?? 0));
      if (!product) throw new Error(`לא ניתן היה להתאים את מוצר שורה ${sourceRow.rowNumber} לאחר הקליטה.`);

      await employerInterfaceApi.updateProductMetadata(
        scope.organizationId, scope.employerId, reportId, product.id, sourceRow.metadata,
      );
      if (sourceRow.previousReference.previousIdentifier || sourceRow.previousReference.previousClearingIdentifier
        || sourceRow.previousReference.previousReferenceExceptionCode != null) {
        await employerInterfaceApi.updatePreviousReference(
          scope.organizationId, scope.employerId, reportId, product.id, sourceRow.previousReference,
        );
      }

      if (sourceRow.metadata.operationCode !== 6) {
        await manualDepositsApi.savePayment(
          scope.organizationId, scope.employerId, reportId, product.id, sourceRow.payment,
        );
      }
    }

    if (excelIntake.updatePensionMix) {
      const effectiveFrom = `${month}-01`;
      const mixProducts: EmployeePensionProductInput[] = sorted.map(({ product }) => ({
        productType: product.productType,
        policyNumber: product.policyNumber,
        fundExternalKey: product.fundExternalKey,
        fundCode: product.fundCode,
        fundName: product.fundName,
        fundCompanyName: product.fundCompanyName,
        fundClassification: product.fundClassification,
        salary: product.salary,
        reportingType: product.reportingType,
        salaryLayer: product.salaryLayer,
        section14: product.section14,
        section14Code: product.section14Code,
        section14StartDate: product.section14StartDate,
        isActive: true,
        effectiveFrom,
        effectiveTo: null,
        institutionalBody: product.fundCompanyName ?? "",
        manufacturer: product.fundCompanyName ?? "",
        salaryAllocationType: product.salaryAllocationType,
        salaryAllocationValue: product.salaryAllocationValue,
        allocationOrder: product.allocationOrder,
        employerContributions: product.employerContributions,
        employeeContributions: product.employeeContributions,
      }));
      await employeesApi.saveEmployeePensionMix(scope.organizationId, scope.employerId, employmentId, mixProducts, monthlySalary);
    }
  }

  return { created, employmentIds };
}
