"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { useCreateOrganization } from "@/features/organizations/queries";
import { AppShell } from "@/features/shell/components/app-shell";
import { UiInput } from "@/components/ui/ui-controls";
import { DataTable, DataTableLink } from "@/components/ui/data-table";
import { useAppStore } from "@/lib/session/use-app-store";
import { useScopeContext } from "@/features/scope/scope-context";
import { errorMessage } from "@/lib/api/error-messages";
import { organizationTypeLabel, organizationTypeOptions } from "@/features/organizations/organization-types";
import { useWatch } from "react-hook-form";
import { newOrganizationSchema } from "@/features/organizations/schemas";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { FormSelect } from "@/components/forms/form-select";
import { TableSkeleton } from "@/components/loading/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function OrganizationsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useZodForm(newOrganizationSchema, { defaultValues: { name: "", type: 7 } });
  const name = useWatch({ control, name: "name" });
  const session = useAppStore((state) => state.session);
  const allowed = Boolean(session?.platformAdmin || session?.isReferent);
  const scope = useScopeContext();
  const createMutation = useCreateOrganization();
  const creating = createMutation.isPending;

  useEffect(() => {
    if (session && !allowed) router.replace("/dashboard");
  }, [session, allowed, router]);

  const organizations = useMemo(() => (scope.data?.organizations ?? [])
    .filter((organization) => session?.platformAdmin || organization.hasOrganizationScope), [scope.data, session?.platformAdmin]);
  const loading = scope.isPending;
  const error = scope.error ? errorMessage(scope.error, "טעינת הארגונים נכשלה") : "";

  function createOrganization(values: { name: string; type: number }) {
    if (creating) return;
    createMutation.mutate(values, {
      onSuccess: (created) => {
        setCreateOpen(false);
        reset({ name: "", type: 7 });
        toast.success("הארגון נוצר בהצלחה");
        router.push(`/organizations/${created.id}`);
      },
      onError: (err) => toast.error(errorMessage(err, "יצירת הארגון נכשלה")),
    });
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((item) => `${item.name} ${item.id}`.toLowerCase().includes(term));
  }, [organizations, query]);

  return <AppShell title="ארגונים" hideScopeController>
    <PageHeader title={session?.platformAdmin ? "ארגונים" : "ארגונים בניהול"}
      description={session?.platformAdmin ? "צפייה וניהול כלל הארגונים במערכת" : "הארגונים שהוקצו לך לניהול מלא"}
      actions={session?.platformAdmin ? <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> ארגון חדש</button> : null} />
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
    <section className="card">
      <div className="toolbar">
        <div className="search"><Search size={17} /><UiInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש ארגון לפי שם" /></div>
        <span className="badge badge-blue">{filtered.length} ארגונים</span>
      </div>
      {loading ? <TableSkeleton columns={4} label="טוען ארגונים..." /> : filtered.length ? <DataTable
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
    <AppModal open={createOpen} title="יצירת ארגון חדש" onClose={() => setCreateOpen(false)} closeDisabled={creating}
      actions={<>
        <button className="btn btn-secondary" type="button" disabled={creating} onClick={() => setCreateOpen(false)}>ביטול</button>
        <button className="btn btn-primary" type="submit" form="create-organization-form" disabled={creating || !name.trim()}>{creating ? "יוצר..." : "יצירת ארגון"}</button>
      </>}>
      <form id="create-organization-form" className="form" onSubmit={handleSubmit(createOrganization)}>
        <div className="field"><label htmlFor="new-organization-name">שם הארגון</label><UiInput id="new-organization-name" required maxLength={200} {...register("name")} disabled={creating} /></div>
        <div className="field"><label htmlFor="new-organization-type">סוג הארגון</label><FormSelect id="new-organization-type" control={control} name="type" numeric disabled={creating}>
          {organizationTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FormSelect></div>
      </form>
    </AppModal>
  </AppShell>;
}

function organizationStatusLabel(status: number) {
  if (status === 1) return "בהקמה";
  if (status === 2) return "פעיל";
  if (status === 3) return "מושהה";
  if (status === 4) return "סגור";
  return String(status);
}
