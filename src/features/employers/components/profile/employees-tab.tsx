"use client";

import { EmployerEmployeesPanel } from "@/features/employers/components/employer-employees-panel";
import type { Employer } from "@/features/employers/types";

export function EmployeesTab({ organizationId, employer, canCreate }: { organizationId: string; employer: Employer; canCreate: boolean }) {
  return <EmployerEmployeesPanel organizationId={organizationId} employer={employer} canCreate={canCreate} />;
}
