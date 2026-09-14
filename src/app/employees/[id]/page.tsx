"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/employee-form";
import { alphaApi } from "@/lib/api";
import type { Employee, Employer } from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId, employerId } = useQueryContext();
  const [employee, setEmployee] = useState<Employee>();
  const [employer, setEmployer] = useState<Employer>();
  const [error, setError] = useState("");
  useEffect(() => { if (organizationId && employerId && id) Promise.all([alphaApi.employee(organizationId, employerId, id), alphaApi.employer(organizationId, employerId)]).then(([person, company]) => { setEmployee(person); setEmployer(company); }).catch((err) => setError(err instanceof Error ? err.message : "טעינת העובד נכשלה")); }, [id, organizationId, employerId]);
  return <AppShell title="פרופיל עובד" hideScopeController><div className="page-head"><div><h1>פרופיל עובד</h1><p>{employer ? <>משויך אל <a className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</a></> : "פרטי העובד וההעסקה"}</p></div></div>{error ? <div className="notice notice-error">{error}</div> : employee ? <EmployeeForm organizationId={organizationId} employerId={employerId} employee={employee} employer={employer} /> : <div className="empty">טוען פרופיל...</div>}</AppShell>;
}
