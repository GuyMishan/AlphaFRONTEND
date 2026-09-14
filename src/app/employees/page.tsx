"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserRoundPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VirtualizedTable } from "@/components/virtualized-table";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employee, Employer } from "@/lib/types";

const PAGE_SIZE = 100;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [query, setQuery] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);

  async function loadScope(orgId: string, empId: string, search = query) {
    if (!orgId || !empId) { setEmployees([]); setEmployer(null); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [result, employerItem, capabilities] = await Promise.all([
        alphaApi.employeeSearch(orgId, empId, search.trim(), 0, PAGE_SIZE),
        alphaApi.employer(orgId, empId),
        alphaApi.employerCapabilities(orgId, empId),
      ]);
      setEmployees(result.items);
      setEmployer(employerItem);
      setCanCreateEmployee(capabilities.canCreateEmployee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת העובדים נכשלה");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const selected = getEmployerSelection();
    if (selected) {
      setOrganizationId(selected.organizationId);
      setEmployerId(selected.employerId);
      void loadScope(selected.organizationId, selected.employerId, "");
    } else setLoading(false);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      if (!detail.employerId) return;
      setOrganizationId(detail.organizationId);
      setEmployerId(detail.employerId);
      setQuery("");
      void loadScope(detail.organizationId, detail.employerId, "");
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  useEffect(() => {
    if (!organizationId || !employerId) return;
    const timer = window.setTimeout(() => void loadScope(organizationId, employerId, query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const selected = organizationId && employerId ? { organizationId, employerId } : null;

  return <AppShell title="עובדים">
    <div className="page-head"><div><h1>עובדים</h1><p>{employer ? <>עובדי <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link></> : "בחרו ארגון ומעסיק בסרגל העליון"}</p></div>{selected && canCreateEmployee ? <Link className="btn btn-primary" href={`/employees/new?organizationId=${organizationId}&employerId=${employerId}`}><UserRoundPlus size={18} />הוספת עובד</Link> : null}</div>
    {selected && !loading && !canCreateEmployee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובדים, אך אין לך הרשאה להקים עובד אצל המעסיק הזה.</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}
    <section className="card">
      <div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, ת״ז או מספר עובד" /></div><span className="badge badge-blue">{employees.length} תוצאות</span></div>
      {loading ? <div className="empty">טוען עובדים מה־Backend...</div> : employees.length ? <VirtualizedTable
        items={employees}
        rowKey={(employee) => employee.id}
        columns={[{ key: "name", label: "שם" }, { key: "nationalId", label: "תעודת זהות" }, { key: "employeeNumber", label: "מספר עובד" }, { key: "startDate", label: "תאריך התחלה" }, { key: "endDate", label: "תאריך סיום" }, { key: "status", label: "סטטוס" }]}
        renderCells={(employee) => [
          <Link className="profile-link" href={`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employerId}`}><b>{employee.firstName} {employee.lastName}</b></Link>,
          employee.nationalId,
          employee.employeeNumber,
          employee.startDate,
          employee.endDate ?? "—",
          <span className={employee.status === 1 ? "badge badge-green" : "badge badge-gray"}>{employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"}</span>,
        ]}
      /> : <div className="empty"><Users size={35} /><div>לא נמצאו עובדים למעסיק הזה.</div></div>}
    </section>
  </AppShell>;
}
