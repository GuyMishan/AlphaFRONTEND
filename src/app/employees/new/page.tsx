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
  const [scopeResolved, setScopeResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selected = getEmployerSelection();
    const orgId = params.get("organizationId") || selected?.organizationId || "";
    const empId = params.get("employerId") || selected?.employerId || "";

    setOrganizationId(orgId);
    setEmployerId(empId);
    setScopeResolved(true);

    if (!orgId || !empId) {
      setLoading(false);
      return;
    }

    Promise.all([
      alphaApi.employer(orgId, empId),
      alphaApi.employerCapabilities(orgId, empId),
    ]).then(([company, capabilities]) => {
      setEmployer(company);
      setCanCreateEmployee(capabilities.canCreateEmployee);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת ההרשאות נכשלה"))
      .finally(() => setLoading(false));
  }, []);

  return <AppShell title="הקמת עובד" hideScopeController>
    <div className="page-head"><div><h1>הקמת עובד</h1><p>העובד יקושר למעסיק שנבחר.</p></div></div>
    {!scopeResolved || loading ? <div className="empty">טוען הרשאות...</div>
      : error ? <div className="notice notice-error">{error}</div>
      : !organizationId || !employerId ? <div className="notice notice-error">לא נבחר מעסיק.</div>
      : canCreateEmployee ? <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} />
      : <div className="notice notice-info">אין לך הרשאה להקים עובד אצל המעסיק הזה.</div>}
  </AppShell>;
}
