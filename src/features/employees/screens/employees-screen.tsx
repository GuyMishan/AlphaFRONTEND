"use client";

import { AppShell } from "@/features/shell/components/app-shell";
import { EmployerEmployeesPanel } from "@/features/employers/components/employer-employees-panel";
import { PlanUsage } from "@/features/billing/components/plan-usage";
import { useEntitlements } from "@/features/billing/queries";
import { useEmployer, useEmployerCapabilities } from "@/features/employers/queries";
import { useEmployerScope } from "@/features/scope/use-employer-scope";
import { errorMessage } from "@/lib/api/error-messages";

export default function EmployeesPage() {
  const { organizationId, employerId } = useEmployerScope();
  const employer = useEmployer(organizationId, employerId);
  const capabilities = useEmployerCapabilities(organizationId, employerId);
  const entitlements = useEntitlements(organizationId, Boolean(employerId));

  const hasScope = Boolean(organizationId && employerId);
  const loading = hasScope && (employer.isPending || capabilities.isPending || entitlements.isPending);
  const failure = employer.error ?? capabilities.error ?? entitlements.error;

  return <AppShell title="עובדים">
    {loading ? <div className="empty">טוען עובדים...</div> : failure ? <div className="notice notice-error">{errorMessage(failure, "טעינת המעסיק נכשלה")}</div> : employer.data && hasScope
      ? <>
          {entitlements.data?.plan.code === "FREE" ? <section className="card" style={{ marginBottom: 18 }}><div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.data.plan.name}</h3></div></div><PlanUsage label="עובדים פעילים" usage={entitlements.data.activeEmployees} /></section> : null}
          <EmployerEmployeesPanel organizationId={organizationId} employer={employer.data} canCreate={Boolean(capabilities.data?.canCreateEmployee)} showHeader />
        </>
      : <div className="empty">בחרו ארגון ומעסיק בסרגל העליון</div>}
  </AppShell>;
}
