import { backendFetch } from "./backend-fetch";

export type ReportFeedbackStatus = "all" | "completed" | "attention" | "partial" | "pending" | "not-sent";

export type ReportFeedbackFilters = {
  status?: ReportFeedbackStatus;
  month?: string;
  reportKind?: string;
  search?: string;
  product?: string;
  treatmentStatus?: string;
  requiresAttention?: boolean;
};

export type ReportFeedbackRow = {
  id: string;
  employerName: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  reportKind: number | string;
  status: number | string;
  revisionRootReportId: string;
  revisionNumber: number;
  isRevisionSnapshot: boolean;
  feedbackStatus: Exclude<ReportFeedbackStatus, "all">;
  hasFeedback: boolean;
  issueCount: number;
  requiresAttentionCount: number;
  reportIssueCount: number;
  employeeCount: number;
  totalAmount: number;
  payoffRate: number | null;
  allocatedAmount: number | null;
  actualReceivedAmount: number | null;
  inTransitAmount: number | null;
  canEdit: boolean;
  canDelete: boolean;
  canStartCorrectionWorkspace: boolean;
  correctionWorkspaceId: string | null;
  pendingCorrectionCount: number;
  canCreateCorrection: boolean;
  createdAt: string;
  updatedAt: string;
  lastTransmission: null | {
    id: string;
    attemptNumber: number;
    status: number | string;
    provider: string;
    externalId: string;
    errorMessage: string;
    startedAt: string | null;
    sentAt: string | null;
    completedAt: string | null;
  };
};

export type TreatmentStatusOption = { code: string; label: string };
export type ReportFeedbackSummary = { total: number; completed: number; attention: number; pending: number };

export type ReportFeedbackDepositRow = {
  id: string;
  reportEmployeeId: string;
  employmentId: string;
  employeeName: string;
  productType: number | string;
  fundName: string;
  fundCompanyName: string;
  policyNumber: string;
  salaryMonth: string;
  totalAmount: number;
  hasFeedback: boolean;
  feedbackStatus: "completed" | "attention" | "partial" | "pending";
  feedbackLabel: string;
  feedbackErrors: string[];
  feedbackErrorSummary: {
    deposit: number;
    employee: number;
    money: number;
    report: number;
    contribution: number;
  };
  moneyStatus: "allocated" | "in-transit" | "received-partial" | "unresolved" | "pending";
  moneyStatusLabel: string;
  treatmentStatus: string;
  treatmentStatusLabel: string;
  updatedAt: string | null;
  requiresAttention: boolean;
  pendingCorrectionReportId: string | null;
  pendingCorrectionProductId: string | null;
  hasPendingCorrection: boolean;
};


export type ReportFeedbackScope = "deposit" | "employee" | "employer" | "money" | "report" | "contribution" | "informational";

export type ReportFeedbackContextIssue = {
  code: number;
  description: string;
  scope: ReportFeedbackScope;
  reportId: string;
  reportProductId: string | null;
  contributionId: string | null;
  receivedAt: string;
};

export type EmployerFeedbackContext = {
  employer: {
    id: string;
    legalName: string;
    registrationNumber: string;
    withholdingFileNumber: string;
    status: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    contactMobile: string;
  };
  issues: ReportFeedbackContextIssue[];
};

export type ReportFeedbackContext = {
  employer: { id: string; legalName: string };
  report: {
    id: string;
    reportingMonth: string;
    salaryPaymentDate: string | null;
    reportKind: number | string;
    status: number | string;
    employeeCount: number;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  issues: ReportFeedbackContextIssue[];
};

export type ReportFeedbackDepositDetails = {
  report: {
    id: string;
    reportingMonth: string;
    reportKind: number | string;
    status: number | string;
    canEdit: boolean;
  };
  employee: {
    id: string;
    employmentId: string;
    name: string;
    nationalId: string;
    monthlySalary: number;
  };
  product: {
    id: string;
    fundName: string;
    fundCompanyName: string;
    fundCode: string;
    policyNumber: string;
    salaryMonth: string;
    salary: number;
    reportingType: string;
    totalAmount: number;
  };
  employerContributions: Array<{
    id: string;
    contributionTypeCode: number;
    label: string;
    amount: number;
    percentage: number;
    exemptPayments: number;
  }>;
  manufacturerContributions: Array<{
    contributionId: string;
    recordIdentifier: string;
    sequence: number;
    intakeStatus: number | null;
    errorCode: number | null;
    errorDescription: string;
    errorScope: "contribution" | "deposit" | "employee" | "money" | "report" | "informational";
    errorAmount: number | null;
    errorDate: string | null;
    contributionTypeCode: number | null;
    calculatedSalary: number | null;
    salaryMonth: string | null;
    policyNumber: string;
    contributionRate: number | null;
    contributionAmount: number | null;
    sourceFileName: string;
    receivedAt: string;
  }>;
  money: null | {
    reportedDepositAmount: number;
    actualReceivedAmount: number;
    allocatedAmount: number;
    inTransitAmount: number;
    proactiveRefundAmount: number | null;
    employerAccountRefundAmount: number | null;
    moneyTreatmentStatus: number | null;
    statusDetail: string;
    paymentReference: string;
    valueDate: string | null;
    trustAccountValueDate: string | null;
    correctnessTimestamp: string;
    clearingIdentifier: string;
    receivedAt: string;
  };
  payment: null | {
    providerName: string;
    providerAccount: string;
    paymentMethod: string;
    valueDate: string | null;
    trustAccountValueDate: string | null;
    actualDepositAmount: number | null;
    masavSenderCode: string;
    referenceNumber: string;
    employerBankName: string;
    employerBankCode: string;
    employerBranch: string;
    employerAccount: string;
  };
  treatment: null | {
    statusCode: string;
    label: string;
    note: string;
    updatedAt: string;
    updatedBy: string;
  };
  treatmentHistory: Array<{
    previousStatusCode: string;
    previousStatusLabel: string;
    statusCode: string;
    statusLabel: string;
    note: string;
    createdAt: string;
    updatedBy: string;
  }>;
  canUpdateTreatment: boolean;
  canCreateCorrection: boolean;
};

export type ReportFeedbackIssue = {
  source: string;
  code: string;
  description: string;
  employeeId: string | null;
  employeeName: string | null;
  productId: string | null;
  productName: string | null;
  actionType: "EditReport" | "RetryTransmission" | string;
};

export type ReportFeedbackDetails = {
  report: {
    id: string;
    reportingMonth: string;
    salaryPaymentDate: string | null;
    reportKind: number | string;
    status: number | string;
    validationError: string;
    createdAt: string;
    updatedAt: string;
  };
  feedbackStatus: string;
  issueCount: number;
  issues: ReportFeedbackIssue[];
  officialFeedback: Array<{
    id: string;
    documentType: number | string;
    sourceFileName: string;
    interfaceFileNumber: string;
    payloadHash: string;
    transmissionId: string | null;
    receivedAt: string;
  }>;
  depositFeedback: Array<{
    reportProductId: string;
    hasRecordFeedback: boolean;
    records: Array<{
      recordIdentifier: string;
      intakeStatus: number | null;
      errorCode: number | null;
      description: string;
      sourceFileName: string;
      receivedAt: string | null;
    }>;
  }>;
  transmissions: Array<{
    id: string;
    attemptNumber: number;
    status: number | string;
    provider: string;
    externalId: string;
    errorMessage: string;
    startedAt: string | null;
    sentAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await backendFetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.error === "treatment_conflict"
        ? "הטיפול עודכן במקביל על ידי משתמש אחר. רעננו את הפרטים ונסו שוב."
        : problem?.error ?? problem?.detail ?? problem?.title ?? message;
    } catch { /* empty */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function base(organizationId: string, employerId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/report-feedback`;
}

const treatmentStatusCache = new Map<string, Promise<TreatmentStatusOption[]>>();

export const reportFeedbackApi = {
  employerContext: (organizationId: string, employerId: string) =>
    request<EmployerFeedbackContext>(`${base(organizationId, employerId)}/employer-context`),
  reportContext: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportFeedbackContext>(`${base(organizationId, employerId)}/${reportId}/context`),
  list: (organizationId: string, employerId: string, filters: ReportFeedbackFilters = {}, skip = 0, take = 50) => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take), feedbackStatus: filters.status ?? "all" });
    if (filters.month) params.set("month", filters.month);
    if (filters.reportKind) params.set("reportKind", filters.reportKind);
    if (filters.search) params.set("search", filters.search);
    if (filters.product) params.set("product", filters.product);
    if (filters.treatmentStatus) params.set("treatmentStatus", filters.treatmentStatus);
    if (filters.requiresAttention) params.set("requiresAttention", "true");
    return request<{ items: ReportFeedbackRow[]; hasMore: boolean; summary: ReportFeedbackSummary }>(`${base(organizationId, employerId)}/?${params}`);
  },
  details: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportFeedbackDetails>(`${base(organizationId, employerId)}/${reportId}`),
  deposits: (
    organizationId: string,
    employerId: string,
    reportId: string,
    search = "",
    skip = 0,
    take = 50,
    manufacturer = "",
  ) => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    if (manufacturer) params.set("manufacturer", manufacturer);
    return request<{ items: ReportFeedbackDepositRow[]; hasMore: boolean; manufacturers: string[] }>(
      `${base(organizationId, employerId)}/${reportId}/deposits?${params}`,
    );
  },
  depositDetails: (organizationId: string, employerId: string, reportId: string, reportProductId: string) =>
    request<ReportFeedbackDepositDetails>(
      `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}`,
    ),
  treatmentStatuses: (organizationId: string, employerId: string) => {
    const key = `${organizationId}:${employerId}`;
    const cached = treatmentStatusCache.get(key);
    if (cached) return cached;
    const pending = request<TreatmentStatusOption[]>(`${base(organizationId, employerId)}/treatment-statuses`)
      .catch((error) => {
        treatmentStatusCache.delete(key);
        throw error;
      });
    treatmentStatusCache.set(key, pending);
    return pending;
  },
  updateTreatment: (
    organizationId: string,
    employerId: string,
    reportId: string,
    reportProductId: string,
    statusCode: string,
    note: string,
    expectedUpdatedAt: string | null,
  ) => request<{ statusCode: string; label: string; note: string; updatedAt: string }>(
    `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}/treatment`,
    { method: "PUT", body: JSON.stringify({ statusCode, note, expectedUpdatedAt }) },
  ),
  exportReport: async (
    organizationId: string,
    employerId: string,
    reportId: string,
    exportType: "contributions" | "deposits" | "feedback",
  ) => {
    const response = await backendFetch(`${base(organizationId, employerId)}/${reportId}/exports/${exportType}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`אירעה שגיאה (${response.status})`);
    return response.blob();
  },
};
