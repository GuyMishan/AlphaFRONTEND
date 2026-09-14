"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/employee-form";
import { alphaApi } from "@/lib/api";
import type { Employer } from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";

export default function NewEmployeePage() {
  const { organizationId, employerId } = useQueryContext();
  const [employer, setEmployer] = useState<Employer>();
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !employerId) { setLoading(false); return; }
    Promise.all([
      alphaApi.employer(organizationId, employerId),
      alphaApi.employerCapabilities(organizationId, employerId)
    ]).then(([company, capabilities]) => {
      setEmployer(company);
      setCanCreateEmployee(capabilities.canCreateEmployee);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת ההרשאות נכשלה"))
      .finally(() => setLoading(false));
  }, [organizationId, employerId]);

  return <AppShell title="הקמת עובד" hideScopeController><div className="page-head"><div><h1>הקמת עובד</h1><p>העובד יקושר למעסיק שנבחר.</p></div></div>{error ? <div className="notice notice-error">{error}</div> : !organizationId || !employerId ? <div className="notice notice-error">לא נבחר מעסיק.</div> : loading ? <div className="empty">טוען הרשאות...</div> : canCreateEmployee ? <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} /> : <div className="notice notice-info">אין לך הרשאה להקים עובד אצל המעסיק הזה.</div>}</AppShell>;
}
