"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/features/shell/components/app-shell";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { PlanUsage } from "@/features/billing/components/plan-usage";
import { useEntitlements } from "@/features/billing/queries";
import { useEmployer, useEmployerCapabilities } from "@/features/employers/queries";
import { errorMessage } from "@/lib/api/error-messages";
import { getEmployerSelection } from "@/lib/session/storage";
import { openUpgradeDialog } from "@/features/billing/upgrade";
import { subscribeToScopeChanges } from "@/features/scope/scope-events";
import { FormSkeleton } from "@/components/loading/skeleton";
import { PageHeader } from "@/components/layout/page-header";

function initialEmployerScope() {
  const params = new URLSearchParams(window.location.search);
  const selected = getEmployerSelection();
  return {
    organizationId: params.get("organizationId") || selected?.organizationId || "",
    employerId: params.get("employerId") || selected?.employerId || "",
  };
}

export default function NewEmployeePage() {
  const [scopeResolved, setScopeResolved] = useState(false);
  const [{ organizationId, employerId }, setScope] = useState({ organizationId: "", employerId: "" });
  useEffect(() => {
    setScope(initialEmployerScope());
    setScopeResolved(true);
    return subscribeToScopeChanges((detail) => {
      setScope({ organizationId: detail.organizationId, employerId: detail.employerId ?? "" });
    });
  }, []);

  const hasScope = Boolean(organizationId && employerId);
  const employerQuery = useEmployer(organizationId, employerId);
  const capabilities = useEmployerCapabilities(organizationId, employerId);
  const entitlementsQuery = useEntitlements(organizationId, Boolean(employerId));
  const loading = hasScope && (employerQuery.isPending || capabilities.isPending || entitlementsQuery.isPending);
  const failure = employerQuery.error ?? capabilities.error ?? entitlementsQuery.error;
  const error = failure ? errorMessage(failure, "טעינת ההרשאות נכשלה") : "";
  const employer = failure ? undefined : employerQuery.data;
  const canCreateEmployee = !failure && Boolean(capabilities.data?.canCreateEmployee);
  const entitlements = entitlementsQuery.data;

  return <AppShell title="הקמת עובד">
    <PageHeader title="הקמת עובד" description={employer ? <>העובד יקושר אל {employer.legalName}.</> : "בחרו מעסיק בסרגל העליון כדי להקים עובד."} />
    {!scopeResolved || loading ? <FormSkeleton label="טוען הרשאות..." />
      : error ? <div className="notice notice-error">{error}</div>
      : !organizationId || !employerId ? <div className="empty">בחרו מעסיק כדי להתחיל בהקמת העובד.</div>
      : !canCreateEmployee ? <div className="notice notice-info">אין לך הרשאה להקים עובד אצל המעסיק הזה.</div>
      : entitlements ? <><section className="card" style={{ marginBottom: 18 }}><div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.plan.name}</h3></div></div><PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} /></section>{entitlements.activeEmployees.maximum !== null && entitlements.activeEmployees.current >= entitlements.activeEmployees.maximum ? <div className="notice notice-info"><b>הגעתם למגבלת העובדים הפעילים במסלול.</b><div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "active_employees", planName: entitlements.plan.name, current: entitlements.activeEmployees.current, maximum: entitlements.activeEmployees.maximum ?? undefined })}>יצירת קשר לשדרוג</button></div></div> : <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />}</>
      : <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />}
  </AppShell>;
}
