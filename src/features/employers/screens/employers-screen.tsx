"use client";

import { UiInput } from "@/components/ui/ui-controls";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { DataTable, DataTableLink } from "@/components/ui/data-table";
import { useEmployerSearch } from "@/features/employers/queries";
import { useOrganizationCapabilities } from "@/features/organizations/queries";
import { useScopeContext } from "@/features/scope/scope-context";
import { subscribeToScopeChanges } from "@/features/scope/scope-events";
import { employerStatusBadgeClass, employerStatusLabel } from "@/features/employers/employer-status";
import { getOrganizationSelection } from "@/lib/session/storage";
import { errorMessage } from "@/lib/api/error-messages";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const PAGE_SIZE = 100;

export default function EmployersPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const scope = useScopeContext();

  useEffect(() => {
    setSelectedOrganizationId(getOrganizationSelection() ?? "");
    return subscribeToScopeChanges((detail) => {
      setSelectedOrganizationId(detail.organizationId);
      setQuery("");
    });
  }, []);

  const organizationId = selectedOrganizationId || scope.data?.organizations[0]?.id || "";
  const organization = scope.data?.organizations.find((item) => item.id === organizationId);
  const searchesOrganization = Boolean(organization?.hasOrganizationScope);

  const employerSearch = useEmployerSearch(organizationId, search, PAGE_SIZE, searchesOrganization);
  const capabilities = useOrganizationCapabilities(organizationId, searchesOrganization);

  // Users without organization scope see only the employers assigned to them.
  const assignedEmployers = useMemo(() => {
    if (!scope.data || searchesOrganization) return [];
    const normalized = search.toLowerCase();
    return scope.data.organizations
      .flatMap((item) => item.employers)
      .filter((employer) => !normalized
        || `${employer.legalName} ${employer.registrationNumber} ${employer.withholdingFileNumber}`.toLowerCase().includes(normalized));
  }, [scope.data, searchesOrganization, search]);

  const employers = searchesOrganization ? employerSearch.data?.pages.flatMap((page) => page.items) ?? [] : assignedEmployers;
  const canCreate = searchesOrganization && Boolean(capabilities.data?.canCreateEmployer);
  const loading = scope.isPending || (searchesOrganization && (employerSearch.isPending || capabilities.isPending));
  const failure = scope.error ?? employerSearch.error ?? capabilities.error;
  const error = failure ? errorMessage(failure, "טעינת המעסיקים נכשלה") : "";

  return <AppShell title="מעסיקים">
    <div className="page-head"><div><h1>מעסיקים</h1><p>צפייה וניהול המעסיקים הזמינים עבורך</p></div>{canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}><Plus size={18} />הקמת מעסיק</Link> : null}</div>
    {!canCreate && !loading ? <div className="notice notice-info" style={{ marginBottom: 18 }}>אין לך הרשאה להקים מעסיק חדש. ניתן לצפות ולערוך רק מעסיקים שהוקצו לך.</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}
    <section className="card">
      <div className="toolbar"><div className="search"><Search size={17} /><UiInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, ח.פ. או תיק ניכויים" /></div><span className="badge badge-blue">{employers.length} תוצאות</span></div>
      {loading ? <div className="empty">טוען מעסיקים...</div> : employers.length ? <DataTable
        items={employers}
        rowKey={(employer) => employer.id}
        columns={[{ key: "name", label: "שם המעסיק" }, { key: "registration", label: "ח.פ." }, { key: "withholding", label: "תיק ניכויים" }, { key: "status", label: "סטטוס" }]}
        hasMore={searchesOrganization && employerSearch.hasNextPage}
        loadingMore={employerSearch.isFetchingNextPage}
        onLoadMore={() => void employerSearch.fetchNextPage()}
        renderCells={(employer) => [
          <DataTableLink key="name" className="table-entity-link" href={`/employers/${employer.id}?organizationId=${employer.organizationId}`}>{employer.legalName}</DataTableLink>,
          employer.registrationNumber,
          employer.withholdingFileNumber,
          <span key="status" className={employerStatusBadgeClass(employer.status)}>{employerStatusLabel(employer.status)}</span>,
        ]}
      /> : <div className="empty"><Building2 size={35} /><div>לא נמצאו מעסיקים.</div></div>}
    </section>
  </AppShell>;
}
