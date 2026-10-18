import type { EmployerSelection } from "@/lib/session/app-store";
import { collectPages } from "@/lib/api/paging";
import { manualReportsApi } from "../api";
import { derivedReportsApi } from "../derived-reports-api";
import { manualDepositsApi } from "../deposits-api";
import { employerInterfaceApi } from "../employer-interface-api";
import type { ReportEntry, ReportWizardState } from "./model";

export async function loadReportEmploymentIds(scope: EmployerSelection, reportId: string) {
  const employees = await collectPages(skip =>
    manualReportsApi.manualReportEmployees(scope.organizationId, scope.employerId, reportId, "", skip, 100));
  return employees.map(employee => employee.employmentId);
}

export async function loadEditableReport(scope: EmployerSelection, reportId: string) {
  const [report, selectedIds] = await Promise.all([
    manualReportsApi.manualReport(scope.organizationId, scope.employerId, reportId),
    loadReportEmploymentIds(scope, reportId),
  ]);
  if (!["1", "2", "9", "Draft", "ReadyForValidation", "Error"].includes(String(report.status))) {
    throw new Error("הדיווח כבר אינו ניתן לעריכה.");
  }
  return { report, selectedIds };
}

/** Persist the details stage; returns only changes the wizard needs to display. */
export async function createReportFromDetails(
  scope: EmployerSelection,
  state: ReportWizardState,
  entry: ReportEntry,
  onReportCreated: (reportId: string) => void,
) {
  const { organizationId, employerId } = scope;
  if (state.reportId) {
    await manualReportsApi.updateManualReportPaymentAccount(organizationId, employerId, state.reportId, state.paymentAccountId);
    return {};
  }
  if (state.reportKind === 1 && state.mode === "manual") {
    const report = await manualReportsApi.createManualReport(organizationId, employerId, {
      reportingMonth: `${state.month}-01`,
      salaryPaymentDate: state.salaryPaymentDate,
      employmentIds: state.selectedIds,
      paymentAccountId: state.paymentAccountId,
    });
    onReportCreated(report.id);
    return { reportId: report.id };
  }
  if (state.reportKind === 1 && state.mode !== "correction") return {};

  // Business correction flow: reuse the immutable-source correction workspace rather
  // than creating a legacy Differences draft that cannot be materialized.
  if (state.reportKind === 2 && !entry.sourceReportId) {
    const workspace = await derivedReportsApi.ensureCorrectionWorkspace(organizationId, employerId, state.sourceReportId);
    onReportCreated(workspace.reportId);
    const selectedIds = await loadReportEmploymentIds(scope, workspace.reportId);
    return { reportId: workspace.reportId, selectedIds };
  }

  const isFocusedSource = Boolean(entry.sourceProductId && state.sourceReportId === entry.sourceReportId);
  const report = await derivedReportsApi.create(organizationId, employerId, {
    sourceReportId: state.sourceReportId,
    reportKind: state.reportKind,
    reportingMonth: `${state.month}-01`,
    salaryPaymentDate: state.salaryPaymentDate,
    paymentAccountId: state.paymentAccountId,
    correctionOperationCode: state.mode === "correction" ? state.correctionOperationCode : undefined,
    reportProductIds: isFocusedSource ? [entry.sourceProductId] : undefined,
  });
  // Preserve the draft for retry even if loading its employees/metadata fails.
  onReportCreated(report.id);
  const selectedIds = await loadReportEmploymentIds(scope, report.id);
  if (state.reportKind === 3 && entry.resolver === "documents" && isFocusedSource) {
    const page = await manualDepositsApi.list(organizationId, employerId, report.id, "", 0, 10);
    const product = page.items.find(item => item.sourceReportProductId === entry.sourceProductId)
      ?? (page.items.length === 1 ? page.items[0] : null);
    if (product) {
      const metadata = await employerInterfaceApi.productMetadata(organizationId, employerId, report.id, product.id);
      await employerInterfaceApi.updateProductMetadata(organizationId, employerId, report.id, product.id, { ...metadata, operationCode: 5 });
      return { reportId: report.id, selectedIds, focusedProductId: product.id, step: 3 };
    }
  }
  return { reportId: report.id, selectedIds };
}
