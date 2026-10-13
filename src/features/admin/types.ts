export type RunSummary = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeactivated: number;
  errorMessage: string | null;
};

export type IntegrationRow = {
  key: string;
  name: string;
  lastRun: RunSummary | null;
};

export type RunDetail = RunSummary & {
  integrationKey: string;
  integrationName: string;
  details?: Record<string, unknown> | null;
};

export type Referent = {
  id: string;
  displayName: string;
  email: string;
  isActive: boolean;
  organizationIds: string[];
  employerIds: string[];
};

export type PlatformUser = {
  id: string;
  displayName: string;
  email: string;
  nationalId: string | null;
  phone: string | null;
  isPlatformAdmin: boolean;
  isReferent: boolean;
  isActive: boolean;
};
