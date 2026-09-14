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
  useEffect(() => { if (organizationId && employerId) void alphaApi.employer(organizationId, employerId).then(setEmployer); }, [organizationId, employerId]);
  return <AppShell title="הקמת עובד" hideScopeController><div className="page-head"><div><h1>הקמת עובד</h1><p>העובד יקושר למעסיק שנבחר.</p></div></div>{organizationId && employerId ? <EmployeeForm organizationId={organizationId} employerId={employerId} employer={employer} /> : <div className="notice notice-error">לא נבחר מעסיק.</div>}</AppShell>;
}
