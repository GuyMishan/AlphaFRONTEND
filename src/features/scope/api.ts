import { apiRequest } from "@/lib/api/client";
import type { EmployerInput } from "@/features/employers/types";
import type { GlobalScopeContext, OnboardingStatus, SelfServiceOnboardingResult } from "@/features/scope/types";

export const scopeApi = {
  scope: (): Promise<GlobalScopeContext> => apiRequest<GlobalScopeContext>("/api/scope"),
  onboardingStatus: (): Promise<OnboardingStatus> =>
    apiRequest<OnboardingStatus>("/api/onboarding/status"),
  completeSelfServiceOnboarding: (payload: EmployerInput): Promise<SelfServiceOnboardingResult> =>
    apiRequest<SelfServiceOnboardingResult>("/api/onboarding/self-service", { method: "POST", body: payload }),
};
