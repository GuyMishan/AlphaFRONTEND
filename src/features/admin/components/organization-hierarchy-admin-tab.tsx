"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UiInput } from "@/components/ui/ui-controls";
import { DataTable, DataTableLink } from "@/components/ui/data-table";
import { EmployerTransferModal } from "@/features/employers/components/employer-transfer-modal";
import { employersApi } from "@/features/employers/api";
import { organizationsApi } from "@/features/organizations/api";
import { invalidateEmployerData } from "@/features/employers/queries";
import { invalidateScopeContext } from "@/features/scope/scope-context";
import { employerStatusLabel } from "@/features/employers/employer-status";
import { errorMessage } from "@/lib/api/error-messages";
import type { Employer } from "@/features/employers/types";
import type { Organization } from "@/features/organizations/types";

type OrganizationRow = Organization & { employers: Employer[] };
type EmployerRow = { employer: Employer; organization: Organization };

async function loadHierarchy(signal?: AbortSignal): Promise<OrganizationRow[]> {
  const organizations = await organizationsApi.organizations(signal);
  // The organization endpoint is platform-wide for administrators. Search each
  // organization's employers with paging rather than silently truncating at 500.
  return Promise.all(organizations.map(async (organization) => {
    const employers: Employer[] = [];
    for (let skip = 0; ; ) {
      const page = await employersApi.employerSearch(organization.id, "", skip, 100, signal);
      employers.push(...page.items);
      skip += page.items.length;
      if (!page.hasMore || page.items.length === 0) break;
    }
    return { ...organization, employers };
  }));
}

export function OrganizationHierarchyAdminTab() {
  const [view, setView] = useState<"organizations" | "employers">("organizations");
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState<Employer | null>(null);
  const [receivingInto, setReceivingInto] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const hierarchy = useQuery({
    queryKey: ["platform-admin", "organization-hierarchy"],
    queryFn: ({ signal }) => loadHierarchy(signal),
  });
  const term = search.trim().toLocaleLowerCase("he");
  const allEmployers = useMemo(() => (hierarchy.data ?? []).flatMap((organization) =>
    organization.employers.map((employer): EmployerRow => ({ employer, organization }))), [hierarchy.data]);
  const organizations = (hierarchy.data ?? []).filter((org) =>
    !term || org.name.toLocaleLowerCase("he").includes(term) ||
      org.employers.some((employer) => employer.legalName.toLocaleLowerCase("he").includes(term) ||
        employer.registrationNumber.includes(term)));
  const employers = allEmployers.filter(({ employer, organization }) =>
    !term || `${employer.legalName} ${employer.registrationNumber} ${organization.name}`.toLocaleLowerCase("he").includes(term));

  async function onTransferred(organizationId: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["platform-admin", "organization-hierarchy"] }),
      invalidateScopeContext(),
      invalidateEmployerData(queryClient, organizationId),
    ]);
  }

  return <section className="card">
    <div className="card-head">
      <div>
        <h2>ניהול מבנה ארגוני</h2>
        <p>צפייה בארגונים ובמעסיקים, ושינוי שיוך מעסיקים בידי מנהל מערכת.</p>
      </div>
      <div className="admin-actions" role="group" aria-label="אופן הצגת המבנה הארגוני">
        <button type="button" className={view === "organizations" ? "btn btn-primary" : "btn btn-secondary"}
          aria-pressed={view === "organizations"} onClick={() => setView("organizations")}>לפי ארגונים</button>
        <button type="button" className={view === "employers" ? "btn btn-primary" : "btn btn-secondary"}
          aria-pressed={view === "employers"} onClick={() => setView("employers")}>לפי מעסיקים</button>
      </div>
    </div>
    <div className="toolbar">
      <UiInput aria-label="חיפוש ארגון או מעסיק" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="חיפוש לפי ארגון, מעסיק או מספר חברה" />
    </div>
    {hierarchy.error ? <div className="notice notice-error" role="alert">
      {errorMessage(hierarchy.error, "טעינת המבנה הארגוני נכשלה")}
      <button type="button" className="btn btn-secondary" onClick={() => void hierarchy.refetch()}>ניסיון חוזר</button>
    </div> : null}
    {view === "organizations" ? <DataTable
      items={organizations}
      loading={hierarchy.isPending}
      rowKey={(item) => item.id}
      columns={[{ key: "organization", label: "ארגון" }, { key: "count", label: "מספר מעסיקים" }, { key: "actions", label: "פעולות", width: "240px" }]}
      expandedRowComponentSize={(item) => Math.min(340, Math.max(105, 90 + item.employers.length * 51))}
      expandedRowComponent={(item) => <div style={{ padding: 12, maxHeight: 325, overflow: "auto" }}>
        {item.employers.length ? <DataTable items={item.employers} rowKey={(employer) => employer.id} maxHeight={285}
          columns={[{ key: "name", label: "מעסיק" }, { key: "status", label: "סטטוס" }, { key: "actions", label: "פעולות" }]}
          renderCells={(employer) => [
            <DataTableLink key="employer" href={`/employers/${employer.id}?organizationId=${item.id}`}>{employer.legalName}</DataTableLink>,
            employerStatusLabel(employer.status),
            <button key="move" className="btn btn-secondary" onClick={() => setMoving(employer)}>העבר לארגון אחר</button>,
          ]} /> : <div className="empty">אין מעסיקים בארגון הזה.</div>}
      </div>}
      renderCells={(item) => [
        <DataTableLink key="org" href={`/organizations/${item.id}?tab=employers`}>{item.name}</DataTableLink>,
        item.employers.length,
        <button key="receive" className="btn btn-secondary" onClick={() => setReceivingInto(item.id)}>שיוך מעסיק קיים</button>,
      ]}
    /> : <DataTable
      items={employers}
      loading={hierarchy.isPending}
      rowKey={(item) => item.employer.id}
      columns={[{ key: "employer", label: "מעסיק" }, { key: "organization", label: "ארגון" }, { key: "status", label: "סטטוס" }, { key: "actions", label: "פעולות" }]}
      renderCells={({ employer, organization }) => [
        <DataTableLink key="name" href={`/employers/${employer.id}?organizationId=${organization.id}`}>{employer.legalName}</DataTableLink>,
        <DataTableLink key="org" href={`/organizations/${organization.id}?tab=employers`}>{organization.name}</DataTableLink>,
        employerStatusLabel(employer.status),
        <button key="move" className="btn btn-secondary" onClick={() => setMoving(employer)}>העבר לארגון אחר</button>,
      ]}
    />}
    <div className="notice notice-info" style={{ marginTop: 12 }}>
      מעסיקים ללא ארגון: מודל הנתונים הנוכחי דורש שיוך לארגון. לא ניתן להציג או לנתק מעסיק ללא שינוי מבוקר של מודל הנתונים.
    </div>
    {moving ? <EmployerTransferModal open employer={moving} onClose={() => setMoving(null)}
      onTransferred={(organizationId) => void onTransferred(organizationId).catch((error) => toast.error(errorMessage(error, "רענון הנתונים נכשל")))} /> : null}
    {receivingInto ? <EmployerTransferModal open receiveIntoOrganizationId={receivingInto} onClose={() => setReceivingInto(null)}
      onTransferred={(organizationId) => void onTransferred(organizationId).catch((error) => toast.error(errorMessage(error, "רענון הנתונים נכשל")))} /> : null}
  </section>;
}
