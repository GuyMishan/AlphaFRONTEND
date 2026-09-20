"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/employee-form";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import { openUpgradeDialog } from "@/lib/upgrade";
import type { Employer, EntitlementSnapshot } from "@/lib/types";

export default function NewEmployeePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [employer, setEmployer] = useState<Employer>();
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const [entitlements, setEntitlements] = useState<EntitlementSnapshot | null>(null);
  const [scopeResolved, setScopeResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEmployerScope(orgId: string, empId: string) {
    setOrganizationId(orgId);
    setEmployerId(empId);
    setScopeResolved(true);
    setError("");

    if (!orgId || !empId) {
      setEmployer(undefined);
      setCanCreateEmployee(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [company, capabilities, entitlements] = await Promise.all([
        alphaApi.employer(orgId, empId),
        alphaApi.employerCapabilities(orgId, empId),
        alphaApi.entitlements(orgId),
      ]);
      setEmployer(company);
      setCanCreateEmployee(capabilities.canCreateEmployee);
      setEntitlements(entitlements);
    } catch (err) {
      setEmployer(undefined);
      setCanCreateEmployee(false);
      setError(err instanceof Error ? err.message : "טעינת ההרשאות נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selected = getEmployerSelection();
    const orgId = params.get("organizationId") || selected?.organizationId || "";
    const empId = params.get("employerId") || selected?.employerId || "";
    void loadEmployerScope(orgId, empId);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      void loadEmployerScope(detail.organizationId, detail.employerId ?? "");
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  return <AppShell title="הקמת עובד">
    <div className="page-head"><div><h1>הקמת עובד</h1><p>{employer ? <>העובד יקושר אל {employer.legalName}.</> : "בחרו מעסיק בסרגל העליון כדי להקים עובד."}</p></div></div>
    {!scopeResolved || loading ? <div className="empty">טוען הרשאות...</div>
      : error ? <div className="notice notice-error">{error}</div>
      : !organizationId || !employerId ? <div className="empty">בחרו מעסיק כדי להתחיל בהקמת העובד.</div>
      : !canCreateEmployee ? <div className="notice notice-info">אין לך הרשאה להקים עובד אצל המעסיק הזה.</div>
      : entitlements ? <><section className="card" style={{ marginBottom: 18 }}><div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.plan.name}</h3></div></div><PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} /></section>{entitlements.activeEmployees.current >= entitlements.activeEmployees.maximum ? <div className="notice notice-info"><b>הגעתם למגבלת העובדים הפעילים במסלול.</b><div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "active_employees", planName: entitlements.plan.name, current: entitlements.activeEmployees.current, maximum: entitlements.activeEmployees.maximum })}>יצירת קשר לשדרוג</button></div></div> : <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />}</>
      : <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />}
  </AppShell>;
}
