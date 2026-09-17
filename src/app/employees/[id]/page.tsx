"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployeeForm } from "@/components/employee-form";
import { EmployeePensionMix } from "@/components/employee-pension-mix";
import { alphaApi } from "@/lib/api";
import type { Employee, Employer } from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";

type ProfileTab = "details" | "mix";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId, employerId } = useQueryContext();
  const [employee, setEmployee] = useState<Employee>();
  const [employer, setEmployer] = useState<Employer>();
  const [canEditEmployee, setCanEditEmployee] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("details");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !employerId || !id) return;
    Promise.all([
      alphaApi.employee(organizationId, employerId, id),
      alphaApi.employer(organizationId, employerId),
      alphaApi.employerCapabilities(organizationId, employerId)
    ]).then(([person, company, capabilities]) => {
      setEmployee(person);
      setEmployer(company);
      setCanEditEmployee(capabilities.canEditEmployee);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת העובד נכשלה"));
  }, [id, organizationId, employerId]);

  return <AppShell title="פרופיל עובד" hideScopeController>
    <div className="page-head"><div><h1>פרופיל עובד</h1><p>{employer ? <>משויך אל <a className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</a></> : "פרטי העובד וההעסקה"}</p></div></div>
    {employee ? <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
      <button type="button" className={`btn ${tab === "details" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("details")}>פרטי העובד</button>
      <button type="button" className={`btn ${tab === "mix" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("mix")}>תמהיל העובד</button>
    </div> : null}
    {error ? <div className="notice notice-error">{error}</div> : employee ? tab === "details"
      ? <div className="employee-profile-layout"><EmployeeForm organizationId={organizationId} employerId={employerId} employee={employee} employer={employer} editable={canEditEmployee} /></div>
      : <EmployeePensionMix organizationId={organizationId} employerId={employerId} employeeId={employee.id} editable={canEditEmployee} />
      : <div className="empty">טוען פרופיל...</div>}
  </AppShell>;
}
