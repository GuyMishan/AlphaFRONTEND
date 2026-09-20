"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/employee-form";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employer } from "@/lib/types";

export default function NewEmployeePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [employer, setEmployer] = useState<Employer>();
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [limitText, setLimitText] = useState("");
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
      const reached = entitlements.activeEmployees.current >= entitlements.activeEmployees.maximum;
      setLimitReached(reached);
      setLimitText(`מסלול ${entitlements.plan.name}: ${entitlements.activeEmployees.current}/${entitlements.activeEmployees.maximum} עובדים פעילים`);
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
      : limitReached ? <div className="notice notice-info"><b>הגעתם למגבלת המסלול</b><div>{limitText}</div></div>
      : <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />}
  </AppShell>;
}
