"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserRound, WalletCards } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { AppTabs } from "@/components/ui/app-tabs";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { EmployeePensionMix } from "@/features/employees/components/employee-pension-mix";
import { useEmployee } from "@/features/employees/queries";
import { useEmployer, useEmployerCapabilities } from "@/features/employers/queries";
import { errorMessage } from "@/lib/api/error-messages";
import { useUrlScope } from "@/lib/hooks/use-url-scope";

type ProfileTab = "details" | "mix";

const tabs = [
  { key: "details", label: "פרטי העובד", icon: UserRound },
  { key: "mix", label: "תמהיל העובד", icon: WalletCards },
] satisfies Array<{ key: ProfileTab; label: string; icon: typeof UserRound }>;

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId, employerId } = useUrlScope();
  const employeeQuery = useEmployee(organizationId, employerId, id);
  const employerQuery = useEmployer(organizationId, employerId);
  const capabilities = useEmployerCapabilities(organizationId, employerId);
  const failure = employeeQuery.error ?? employerQuery.error ?? capabilities.error;
  const error = failure ? errorMessage(failure, "טעינת העובד נכשלה") : "";
  // The profile renders once all three loaded, as before.
  const ready = Boolean(employeeQuery.data && employerQuery.data && capabilities.data);
  const employee = ready ? employeeQuery.data : undefined;
  const employer = ready ? employerQuery.data : undefined;
  const canEditEmployee = Boolean(capabilities.data?.canEditEmployee);
  const [tab, setTab] = useState<ProfileTab>("details");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested === "documents" || requested === "mix") setTab("mix");
  }, []);
  function changeTab(next: string) {
    setTab(next as ProfileTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  return <AppShell title="פרופיל עובד" hideScopeController>
    <div className="page-head"><div><h1>פרופיל עובד</h1><p>{employer ? <>משויך אל <a className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</a></> : "פרטי העובד וההעסקה"}</p></div></div>
    {employee ? <AppTabs items={tabs} activeKey={tab} onChange={changeTab} ariaLabel="פרופיל עובד" /> : null}
    {error ? <div className="notice notice-error">{error}</div> : employee ? tab === "details"
      ? <div className="employee-profile-layout"><EmployeeForm organizationId={organizationId} employerId={employerId} employee={employee} employer={employer} editable={canEditEmployee} /></div>
      : <EmployeePensionMix organizationId={organizationId} employerId={employerId} employeeId={employee.id} employee={employee} editable={canEditEmployee} />
      : <div className="empty">טוען פרופיל...</div>}
  </AppShell>;
}
