import { apiBlob, apiRequest as request } from "@/lib/api/client";

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
  correctionResolutionStatus?: "needs-treatment" | "correction-in-progress" | "transmitted-awaiting-feedback" | "feedback-returned-needs-review";
  awaitingFeedback?: {
    manufacturerCount: number;
    manufacturers: string[];
    clearinghouse: boolean;
    totalDestinations: number;
  };
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
  canResumeHybrid?: boolean;
  hybridTransmission?: {
    recipientCount: number;
    acceptedCount: number;
    rejectedCount: number;
    pendingCount: number;
    uncertainCount: number;
  } | null;
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
  affectedReportIds?: string[];
  errorAmount?: number | null;
  errorDate?: string | null;
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
    isResolved: boolean;
    errorScope: "contribution" | "deposit" | "employee" | "money" | "report" | "informational";
    targetScope: "deposit" | "employee" | "employer" | "report" | "informational";
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

export type FeedbackResolutionContextType = "employer" | "report" | "deposit";
export type FeedbackResolutionType = "edit" | "decision" | "external" | "informational";

export type FeedbackResolutionProblem = {
  problemId: string;
  code: number;
  description: string;
  scope: ReportFeedbackScope;
  targetScope: "employer" | "report" | "employee" | "deposit" | "informational";
  resolutionType: FeedbackResolutionType;
  family: string;
  resolverType: string;
  groupStrategy: string;
  groupKey: string;
  correctionBehavior: string;
  availableActions: string[];
  canEscalateExternally: boolean;
  feedbackId: string;
  reportId: string;
  reportProductId: string | null;
  contributionId: string | null;
  reportEmployeeId: string | null;
  employmentId: string | null;
  personId: string | null;
  employeeName: string;
  productName: string;
  fundCompanyName: string;
  policyNumber: string;
  reportedValues: Record<string, string | null>;
  currentValues: Record<string, string | null>;
  feedbackValues: Record<string, string | null>;
  latestDecision: string | null;
  latestDecisionNote: string;
  latestDecisionAt: string | null;
  externalCaseId: string | null;
  externalCaseStatus: string;
  externalCaseAssigneeName: string;
  receivedAt: string;
};

export type FeedbackResolutionGroup = {
  groupKey: string;
  resolverType: string;
  groupStrategy: string;
  canExecute: boolean;
  problems: FeedbackResolutionProblem[];
};

export type FeedbackResolutionContext = {
  contextType: FeedbackResolutionContextType;
  employerId: string;
  reportId: string | null;
  reportProductId: string | null;
  canResolve: boolean;
  canCreateReport: boolean;
  canEditEmployee: boolean;
  unsupportedCodes: number[];
  problems: FeedbackResolutionProblem[];
  groups: FeedbackResolutionGroup[];
};

export type ManufacturerInquiry = {
  reportProductId: string; errorCode: number; recipient: string;
  manufacturer: string; product: string; subject: string; body: string;
};
export type ManufacturerInquiryHistory = {
  id: string; recipient: string; subject: string; status: "pending" | "sent" | "failed";
  failureCode: string | null; createdAt: string;
};
export type ManufacturerInquiriesResponse = {
  inquiries: ManufacturerInquiry[]; history: ManufacturerInquiryHistory[];
};

export type ExternalFeedbackCase = {
  id: string;
  caseKey: string;
  status: "open" | "waiting" | "resolved";
  destination: string;
  subject: string;
  messageTemplate: string;
  assignedToUserId: string | null;
  assigneeName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  problems: Array<{
    problemId: string;
    reportId: string;
    reportProductId: string | null;
    errorCode: number;
    description: string;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    note: string;
    actorUserId: string;
    actorName: string;
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    originalFileName: string;
    contentType: string;
    sizeBytes: number;
    sha256: string;
    createdAt: string;
  }>;
};

export type FeedbackResolutionProblemSelector = {
  code: number;
  contributionId?: string | null;
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


function base(organizationId: string, employerId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/report-feedback`;
}

export const reportFeedbackApi = {
  employerResolutionContext: (organizationId: string, employerId: string) =>
    request<FeedbackResolutionContext>(`${base(organizationId, employerId)}/resolution-context`),
  reportResolutionContext: (organizationId: string, employerId: string, reportId: string) =>
    request<FeedbackResolutionContext>(`${base(organizationId, employerId)}/${reportId}/resolution-context`),
  depositResolutionContext: (organizationId: string, employerId: string, reportId: string, reportProductId: string) =>
    request<FeedbackResolutionContext>(
      `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}/resolution-context`,
    ),
  prepareInternalResolution: (
    organizationId: string,
    employerId: string,
    reportId: string,
    groupKey: string,
    resolverType: string,
    reportProductId?: string | null,
    problemIds?: string[],
  ) => request<{
    workspaceReportId: string;
    workspaceReportProductId: string | null;
    workspaceReportEmployeeId: string | null;
    created: boolean;
    pendingChanges: number;
    groupKey: string;
    resolverType: string;
  }>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/internal/prepare`,
    {
      method: "POST",
      body: {
        groupKey,
        resolverType,
        reportProductId: reportProductId || null,
        problemIds: problemIds?.length ? problemIds : null,
      },
    },
  ),

  openExternalCase: (
    organizationId: string,
    employerId: string,
    reportId: string,
    groupKey: string,
    problemIds: string[],
    note = "",
    action: "external" | "reconcile" = "external",
  ) => request<ExternalFeedbackCase>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/external-case/open`,
    { method: "POST", body: { groupKey, problemIds, note, action } },
  ),

  manufacturerInquiries: (organizationId: string, employerId: string, caseId: string) =>
    request<ManufacturerInquiriesResponse>(`${base(organizationId, employerId)}/external-cases/${caseId}/manufacturer-inquiries`),
  sendManufacturerInquiry: (organizationId: string, employerId: string, caseId: string,
    reportProductId: string, errorCode: number, subject: string, body: string) =>
    request<{ dispatchId: string; status: string; recipient: string }>(
      `${base(organizationId, employerId)}/external-cases/${caseId}/manufacturer-inquiries`,
      { method: "POST", body: { reportProductId, errorCode, subject, body } },
    ),
  externalCase: (organizationId: string, employerId: string, caseId: string) =>
    request<ExternalFeedbackCase>(
      `${base(organizationId, employerId)}/external-cases/${caseId}`,
    ),

  addExternalCaseNote: (
    organizationId: string,
    employerId: string,
    caseId: string,
    note: string,
  ) => request<ExternalFeedbackCase>(
    `${base(organizationId, employerId)}/external-cases/${caseId}/events`,
    { method: "POST", body: { note } },
  ),

  assignExternalCase: (
    organizationId: string,
    employerId: string,
    caseId: string,
    assignToMe: boolean,
  ) => request<ExternalFeedbackCase>(
    `${base(organizationId, employerId)}/external-cases/${caseId}/assignment`,
    { method: "PUT", body: { assignToMe } },
  ),

  updateExternalCaseStatus: (
    organizationId: string,
    employerId: string,
    caseId: string,
    status: "open" | "waiting" | "resolved",
    note = "",
  ) => request<ExternalFeedbackCase>(
    `${base(organizationId, employerId)}/external-cases/${caseId}/status`,
    { method: "PUT", body: { status, note } },
  ),

  updateExternalCaseTemplate: (
    organizationId: string,
    employerId: string,
    caseId: string,
    destination: string,
    subject: string,
    messageTemplate: string,
  ) => request<ExternalFeedbackCase>(
    `${base(organizationId, employerId)}/external-cases/${caseId}/template`,
    { method: "PUT", body: { destination, subject, messageTemplate } },
  ),

  uploadExternalCaseAttachment: (
    organizationId: string,
    employerId: string,
    caseId: string,
    file: File,
  ) => {
    const body = new FormData();
    body.set("file", file);
    return request<ExternalFeedbackCase>(
      `${base(organizationId, employerId)}/external-cases/${caseId}/attachments`,
      { method: "POST", body, fallbackMessage: "העלאת הקובץ נכשלה." },
    );
  },

  downloadExternalCaseAttachment: (
    organizationId: string,
    employerId: string,
    caseId: string,
    attachmentId: string,
  ) => {
    return apiBlob(
      `${base(organizationId, employerId)}/external-cases/${caseId}/attachments/${attachmentId}`,
      { fallbackMessage: "הורדת הקובץ נכשלה." },
    );
  },

  originalMovementCandidates: (
    organizationId: string,
    employerId: string,
    reportId: string,
    problemId: string,
  ) => request<{ items: Array<{
    contributionId: string;
    recordIdentifier: string;
    reportId: string;
    reportingMonth: string;
    salaryMonth: string;
    amount: number;
    percentage: number;
    productName: string;
    policyNumber: string;
  }> }>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/${encodeURIComponent(problemId)}/original-movement-candidates`,
  ),

  linkOriginalMovement: (
    organizationId: string,
    employerId: string,
    reportId: string,
    problemId: string,
    contributionId: string,
  ) => request<{
    resolvedProblemId: string;
    recordIdentifier: string;
    workspaceReportId: string;
    workspaceReportProductId: string | null;
  }>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/${encodeURIComponent(problemId)}/link-original`,
    { method: "POST", body: { contributionId } },
  ),

  decideProblem: (
    organizationId: string,
    employerId: string,
    reportId: string,
    problemId: string,
    outcome: "confirm" | "correction" | "external" | "reconcile" | "link-original",
    note = "",
  ) => request<{
    decisionId: string;
    problemId: string;
    outcome: string;
    resolved: boolean;
    workspaceReportId: string | null;
    workspaceReportProductId: string | null;
    workspaceReportEmployeeId: string | null;
  }>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/decision`,
    { method: "POST", body: { problemId, outcome, note } },
  ),

  correctionWorkspaceResolutionLinks: (
    organizationId: string,
    employerId: string,
    workspaceReportId: string,
  ) => request<{
    sourceReportId: string | null;
    problemIds: string[];
    resolverTypes: string[];
  }>(
    `${base(organizationId, employerId)}/correction-workspaces/${workspaceReportId}/resolution-links`,
  ),

  resolveProblems: (
    organizationId: string,
    employerId: string,
    reportId: string,
    problemIds: string[],
    source: "employee-save" | "deposit-save" | "workspace-validation",
    validatedReportId?: string | null,
  ) => request<{ resolvedProblemIds: string[] }>(
    `${base(organizationId, employerId)}/${reportId}/resolution-actions/problems/resolve`,
    {
      method: "POST",
      body: {
        problemIds,
        source,
        validatedReportId: validatedReportId || null,
      },
    },
  ),

  uploadResolutionDocument: (
    organizationId: string,
    employerId: string,
    reportId: string,
    problemId: string,
    file: File,
  ) => {
    const body = new FormData();
    body.set("file", file);
    return request<{
      id: string;
      originalFileName: string;
      sizeBytes: number;
      sha256: string;
      resolvedProblemId: string;
    }>(
      `${base(organizationId, employerId)}/${reportId}/resolution-actions/documents/${encodeURIComponent(problemId)}`,
      { method: "POST", body, fallbackMessage: "שמירת המסמך נכשלה." },
    );
  },

  validateEmployeeResolutionAction: (
    organizationId: string,
    employerId: string,
    reportId: string,
    reportProductId: string,
    groupKey: string,
    employmentId: string,
  ) => request<{ groupKey: string; employmentId: string }>(
    `${base(organizationId, employerId)}/${reportId}/deposits/${reportProductId}/resolution-actions/employee/validate`,
    { method: "POST", body: { groupKey, employmentId } },
  ),

  employerContext: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    request<EmployerFeedbackContext>(`${base(organizationId, employerId)}/employer-context`, { signal }),
  reportContext: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportFeedbackContext>(`${base(organizationId, employerId)}/${reportId}/context`),
  list: (organizationId: string, employerId: string, filters: ReportFeedbackFilters = {}, skip = 0, take = 50, signal?: AbortSignal) => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take), feedbackStatus: filters.status ?? "all" });
    if (filters.month) params.set("month", filters.month);
    if (filters.reportKind) params.set("reportKind", filters.reportKind);
    if (filters.search) params.set("search", filters.search);
    if (filters.product) params.set("product", filters.product);
    if (filters.treatmentStatus) params.set("treatmentStatus", filters.treatmentStatus);
    if (filters.requiresAttention) params.set("requiresAttention", "true");
    return request<{ items: ReportFeedbackRow[]; hasMore: boolean; summary: ReportFeedbackSummary }>(`${base(organizationId, employerId)}?${params}`, { signal });
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
  /** Cached by `useTreatmentStatuses` (feedback/queries.ts). */
  treatmentStatuses: (organizationId: string, employerId: string) =>
    request<TreatmentStatusOption[]>(`${base(organizationId, employerId)}/treatment-statuses`),
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
    { method: "PUT", body: { statusCode, note, expectedUpdatedAt } },
  ),
  exportReport: (
    organizationId: string,
    employerId: string,
    reportId: string,
    exportType: "contributions" | "deposits" | "feedback",
  ) => {
    return apiBlob(`${base(organizationId, employerId)}/${reportId}/exports/${exportType}`);
  },
};
