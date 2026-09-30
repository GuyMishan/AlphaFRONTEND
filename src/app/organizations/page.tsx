"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppModal } from "@/components/app-modal";
import { UiSelect } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { UiInput } from "@/components/ui-controls";
import { DataTable, DataTableLink } from "@/components/data-table";
import { getSession } from "@/lib/session";
import { getScopeContext } from "@/lib/app-data-cache";
import type { Organization } from "@/lib/types";

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(1);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session?.platformAdmin) {
      router.replace("/dashboard");
      return;
    }
    getScopeContext()
      .then((scope) => setOrganizations(scope.organizations))
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה"))
      .finally(() => setLoading(false));
  }, [router]);

  async function createOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await alphaApi.createOrganization({ name: name.trim(), type });
      setOrganizations((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name, "he")));
      setCreateOpen(false);
      setName("");
      setType(1);
      toast.success("הארגון נוצר בהצלחה");
      router.push(`/organizations/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "יצירת הארגון נכשלה");
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(term));
  }, [organizations, query]);

  return <AppShell title="ארגונים" hideScopeController>
    <div className="page-head">
      <div><h1>ארגונים</h1><p>צפייה וניהול כלל הארגונים במערכת</p></div>
      <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> ארגון חדש</button>
    </div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
    <section className="card">
      <div className="toolbar">
        <div className="search"><Search size={17} /><UiInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ארגון לפי שם" /></div>
        <span className="badge badge-blue">{filtered.length} ארגונים</span>
      </div>
      {loading ? <div className="empty">טוען ארגונים...</div> : filtered.length ? <DataTable
        items={filtered}
        rowKey={(item) => item.id}
        columns={[
          { key: "name", label: "שם הארגון" },
          { key: "type", label: "סוג" },
          { key: "status", label: "סטטוס" },
          { key: "id", label: "מזהה" },
        ]}
        renderCells={(item) => [
          <DataTableLink key="name" className="table-entity-link" href={`/organizations/${item.id}`}>{item.name}</DataTableLink>,
          organizationTypeLabel(item.type),
          <span key="status" className={item.status === 2 ? "badge badge-green" : "badge badge-gray"}>{organizationStatusLabel(item.status)}</span>,
          <span key="id" dir="ltr">{item.id}</span>,
        ]}
      /> : <div className="empty"><Landmark size={34} /><div>לא נמצאו ארגונים.</div></div>}
    </section>
    <AppModal open={createOpen} title="יצירת ארגון חדש" onClose={() => { if (!creating) setCreateOpen(false); }}>
      <form className="form" onSubmit={createOrganization}>
        <div className="field"><label htmlFor="new-organization-name">שם הארגון</label><UiInput id="new-organization-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} disabled={creating} /></div>
        <div className="field"><label htmlFor="new-organization-type">סוג הארגון</label><UiSelect id="new-organization-type" value={type} onChange={(e) => setType(Number(e.target.value))} disabled={creating}>
          <option value={1}>מעסיק</option><option value={2}>משרד שכר</option><option value={3}>סוכנות ביטוח</option><option value={4}>ספק תפעול</option><option value={5}>קבוצת חברות</option><option value={6}>שירות עצמי</option>
        </UiSelect></div>
        <div className="form-actions"><button className="btn btn-secondary" type="button" disabled={creating} onClick={() => setCreateOpen(false)}>ביטול</button><button className="btn btn-primary" type="submit" disabled={creating || !name.trim()}>{creating ? "יוצר..." : "יצירת ארגון"}</button></div>
      </form>
    </AppModal>
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
