"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Landmark, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UiInput } from "@/components/ui-controls";
import { VirtualizedTable } from "@/components/virtualized-table";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Organization } from "@/lib/types";

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session?.platformAdmin) {
      router.replace("/dashboard");
      return;
    }
    alphaApi.organizations()
      .then(setOrganizations)
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה"))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(term));
  }, [organizations, query]);

  return <AppShell title="ארגונים" hideScopeController>
    <div className="page-head">
      <div><h1>ארגונים</h1><p>צפייה וניהול כלל הארגונים במערכת</p></div>
    </div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
    <section className="card">
      <div className="toolbar">
        <div className="search"><Search size={17} /><UiInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ארגון לפי שם" /></div>
        <span className="badge badge-blue">{filtered.length} ארגונים</span>
      </div>
      {loading ? <div className="empty">טוען ארגונים...</div> : filtered.length ? <VirtualizedTable
        items={filtered}
        rowKey={(item) => item.id}
        columns={[
          { key: "name", label: "שם הארגון" },
          { key: "type", label: "סוג" },
          { key: "status", label: "סטטוס" },
          { key: "id", label: "מזהה" },
        ]}
        renderCells={(item) => [
          <Link key="name" className="table-entity-link" href={`/organizations/${item.id}`}>{item.name}</Link>,
          organizationTypeLabel(item.type),
          <span key="status" className={item.status === 2 ? "badge badge-green" : "badge badge-gray"}>{organizationStatusLabel(item.status)}</span>,
          <span key="id" dir="ltr">{item.id}</span>,
        ]}
      /> : <div className="empty"><Landmark size={34} /><div>לא נמצאו ארגונים.</div></div>}
    </section>
  </AppShell>;
}

function organizationTypeLabel(type: number) {
  if (type === 1) return "מעסיק";
  if (type === 2) return "משרד שכר";
  if (type === 3) return "סוכנות ביטוח";
  if (type === 4) return "ספק תפעול";
  if (type === 5) return "קבוצת חברות";
  if (type === 6) return "שירות עצמי";
  return String(type);
}

function organizationStatusLabel(status: number) {
  if (status === 1) return "בהקמה";
  if (status === 2) return "פעיל";
  if (status === 3) return "מושהה";
  if (status === 4) return "סגור";
  return String(status);
}
