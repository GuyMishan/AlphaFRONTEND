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
  reportingMonth: string;
  salaryPaymentDate: string | null;
  reportKind: number | string;
  status: number | string;
  feedbackStatus: Exclude<ReportFeedbackStatus, "all">;
  hasFeedback: boolean;
  issueCount: number;
  requiresAttentionCount: number;
  employeeCount: number;
  totalAmount: number;
  payoffRate: number | null;
  allocatedAmount: number | null;
  actualReceivedAmount: number | null;
  inTransitAmount: number | null;
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

export type ReportFeedbackDepositRow = {
  id: string;
  reportEmployeeId: string;
  employmentId: string;
  employeeName: string;
  fundName: string;
  fundCompanyName: string;
  policyNumber: string;
  salaryMonth: string;
  totalAmount: number;
  feedbackStatus: "completed" | "attention" | "partial" | "pending";
  feedbackLabel: string;
  moneyStatus: "allocated" | "in-transit" | "received-partial" | "unresolved" | "pending";
  moneyStatusLabel: string;
  treatmentStatus: string;
  treatmentStatusLabel: string;
  updatedAt: string | null;
  requiresAttention: boolean;
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
      message = problem?.error ?? problem?.detail ?? problem?.title ?? message;
    } catch { /* empty */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function base(organizationId: string, employerId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/report-feedback`;
}

export const reportFeedbackApi = {
  list: (organizationId: string, employerId: string, filters: ReportFeedbackFilters = {}, skip = 0, take = 50) => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take), feedbackStatus: filters.status ?? "all" });
    if (filters.month) params.set("month", filters.month);
    if (filters.reportKind) params.set("reportKind", filters.reportKind);
    if (filters.search) params.set("search", filters.search);
    if (filters.product) params.set("product", filters.product);
    if (filters.treatmentStatus) params.set("treatmentStatus", filters.treatmentStatus);
    if (filters.requiresAttention) params.set("requiresAttention", "true");
    return request<{ items: ReportFeedbackRow[]; hasMore: boolean }>(`${base(organizationId, employerId)}/?${params}`);
  },
  details: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportFeedbackDetails>(`${base(organizationId, employerId)}/${reportId}`),
  deposits: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 50) => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    return request<{ items: ReportFeedbackDepositRow[]; hasMore: boolean }>(
      `${base(organizationId, employerId)}/${reportId}/deposits?${params}`,
    );
  },
  depositDetails: (organizationId: string, employerId: string, reportId: string, reportProductId: string) =>
    request<ReportFeedbackDepositDetails>(
      `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}`,
    ),
  treatmentStatuses: (organizationId: string, employerId: string) =>
    request<TreatmentStatusOption[]>(`${base(organizationId, employerId)}/treatment-statuses`),
  updateTreatment: (
    organizationId: string,
    employerId: string,
    reportId: string,
    reportProductId: string,
    statusCode: string,
    note: string,
  ) => request<{ statusCode: string; label: string; note: string; updatedAt: string }>(
    `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}/treatment`,
    { method: "PUT", body: JSON.stringify({ statusCode, note }) },
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
