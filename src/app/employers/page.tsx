"use client";

import { UiInput } from "@/components/ui-controls";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VirtualizedTable } from "@/components/virtualized-table";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";
import type { Employer } from "@/lib/types";

const PAGE_SIZE = 100;

export default function EmployersPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(orgId: string, search = query) {
    setLoading(true); setError("");
    try {
      const scope = await alphaApi.scope();
      const resolvedOrgId = orgId || getOrganizationSelection() || scope.organizations[0]?.id || "";
      if (resolvedOrgId !== organizationId) setOrganizationId(resolvedOrgId);

      const selectedOrganization = scope.organizations.find((item) => item.id === resolvedOrgId);
      const normalizedSearch = search.trim().toLowerCase();

      if (selectedOrganization?.hasOrganizationScope) {
        const [result, capabilities] = await Promise.all([
          alphaApi.employerSearch(resolvedOrgId, search.trim(), 0, PAGE_SIZE),
          alphaApi.capabilities(resolvedOrgId),
        ]);
        setEmployers(result.items);
        setCanCreate(capabilities.canCreateEmployer);
        return;
      }

      const accessibleEmployers = scope.organizations
        .flatMap((organization) => organization.employers)
        .filter((employer) => {
          if (!normalizedSearch) return true;
          return `${employer.legalName} ${employer.registrationNumber} ${employer.withholdingFileNumber}`
            .toLowerCase()
            .includes(normalizedSearch);
        });

      setEmployers(accessibleEmployers);
      setCanCreate(false);
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת המעסיקים נכשלה"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const orgId = getOrganizationSelection() ?? "";
    setOrganizationId(orgId);
    void load(orgId, "");
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      setOrganizationId(detail.organizationId);
      setQuery("");
      void load(detail.organizationId, "");
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    const timer = window.setTimeout(() => void load(organizationId, query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  return <AppShell title="מעסיקים">
    <div className="page-head"><div><h1>מעסיקים</h1><p>צפייה וניהול המעסיקים הזמינים עבורך</p></div>{canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}><Plus size={18} />הקמת מעסיק</Link> : null}</div>
    {!canCreate && !loading ? <div className="notice notice-info" style={{ marginBottom: 18 }}>אין לך הרשאה להקים מעסיק חדש. ניתן לצפות ולערוך רק מעסיקים שהוקצו לך.</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}
    <section className="card">
      <div className="toolbar"><div className="search"><Search size={17} /><UiInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, ח.פ. או תיק ניכויים" /></div><span className="badge badge-blue">{employers.length} תוצאות</span></div>
      {loading ? <div className="empty">טוען מעסיקים...</div> : employers.length ? <VirtualizedTable
        items={employers}
        rowKey={(employer) => employer.id}
        columns={[{ key: "name", label: "שם המעסיק" }, { key: "registration", label: "ח.פ." }, { key: "withholding", label: "תיק ניכויים" }, { key: "status", label: "סטטוס" }]}
        renderCells={(employer) => [
          <Link className="table-entity-link" href={`/employers/${employer.id}?organizationId=${employer.organizationId}`}>{employer.legalName}</Link>,
          employer.registrationNumber,
          employer.withholdingFileNumber,
          <span className={employer.status === 2 ? "badge badge-green" : "badge badge-orange"}>{employer.status === 2 ? "פעיל" : "בהקמה"}</span>,
        ]}
      /> : <div className="empty"><Building2 size={35} /><div>לא נמצאו מעסיקים.</div></div>}
    </section>
  </AppShell>;
}
