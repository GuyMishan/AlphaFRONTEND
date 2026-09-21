"use client";

import { UiInput } from "@/components/ui-controls";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, UserRoundPlus, Users } from "lucide-react";
import { VirtualizedTable } from "@/components/virtualized-table";
import { alphaApi } from "@/lib/api";
import type { Employee, Employer } from "@/lib/types";

const PAGE_SIZE = 100;

export function EmployerEmployeesPanel({
  organizationId,
  employer,
  canCreate,
  showHeader = false,
}: {
  organizationId: string;
  employer: Employer;
  canCreate: boolean;
  showHeader?: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      alphaApi.employeeSearch(organizationId, employer.id, query.trim(), 0, PAGE_SIZE)
        .then((result) => setEmployees(result.items))
        .catch((err) => setError(err instanceof Error ? err.message : "טעינת העובדים נכשלה"))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [organizationId, employer.id, query]);

  return <>
    {showHeader ? <div className="page-head employee-panel-head">
      <div>
        <h1>עובדים</h1>
        <p>עובדי <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link></p>
      </div>
      {canCreate ? <Link className="btn btn-primary" href={`/employees/new?organizationId=${organizationId}&employerId=${employer.id}`}><UserRoundPlus size={18} />הוספת עובד</Link> : null}
    </div> : null}

    {!canCreate ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובדים, אך אין לך הרשאה להקים עובד אצל המעסיק הזה.</div> : null}
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    <section className="card">
      {!showHeader ? <div className="card-head">
        <div><h2>עובדים</h2><span style={{ color: "var(--muted)" }}>עובדי המעסיק וקישורים לפרופילים שלהם.</span></div>
        {canCreate ? <Link className="btn btn-primary" href={`/employees/new?organizationId=${organizationId}&employerId=${employer.id}`}><UserRoundPlus size={18} />הוספת עובד</Link> : null}
      </div> : null}
      <div className="toolbar">
        <div className="search"><Search size={17} /><UiInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, ת״ז או מספר עובד" /></div>
        <span className="badge badge-blue">{employees.length} תוצאות</span>
      </div>
      {loading ? <div className="empty">טוען עובדים...</div> : employees.length ? <VirtualizedTable
        items={employees}
        rowKey={(employee) => employee.id}
        columns={[
          { key: "name", label: "שם" },
          { key: "nationalId", label: "תעודת זהות" },
          { key: "employeeNumber", label: "מספר עובד" },
          { key: "startDate", label: "תאריך התחלה" },
          { key: "endDate", label: "תאריך סיום" },
          { key: "status", label: "סטטוס" },
        ]}
        renderCells={(employee) => [
          <Link key="name" className="profile-link" href={`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employer.id}`}><b>{employee.firstName} {employee.lastName}</b></Link>,
          employee.nationalId,
          employee.employeeNumber,
          employee.startDate,
          employee.endDate ?? "—",
          <span key="status" className={employee.status === 1 ? "badge badge-green" : "badge badge-gray"}>{employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"}</span>,
        ]}
      /> : <div className="empty"><Users size={35} /><div>לא נמצאו עובדים למעסיק הזה.</div></div>}
    </section>
  </>;
}
