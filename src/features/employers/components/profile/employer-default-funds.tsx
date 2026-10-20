"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { UiInput } from "@/components/ui/ui-controls";
import { referenceDataApi } from "@/features/reference-data/api";
import type { PensionFundOption } from "@/features/pension/types";
import { employersApi } from "@/features/employers/api";
import { errorMessage } from "@/lib/api/error-messages";

type Item = { externalKey: string; fundName: string; companyName: string };
type DefaultFundSettings = { overridden: boolean; selectedKeys: string[]; systemDefaultKeys: string[]; selectedFunds: Item[]; systemDefaultFunds: Item[] };

export function EmployerDefaultFunds({ organizationId, employerId, canEdit }: {
  organizationId: string; employerId: string; canEdit: boolean;
}) {
  const [settings, setSettings] = useState<DefaultFundSettings | null>(null);
  const [selected, setSelected] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PensionFundOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const data = await employersApi.employerDefaultFunds(organizationId, employerId);
    setSettings(data);
    setSelected(data.selectedFunds);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void employersApi.employerDefaultFunds(organizationId, employerId)
      .then(data => { if (active) { setSettings(data); setSelected(data.selectedFunds); } })
      .catch(error => { if (active) toast.error(errorMessage(error, "טעינת קרנות ברירת המחדל נכשלה")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, employerId]);

  useEffect(() => {
    if (!canEdit || !query.trim()) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      void referenceDataApi.pensionFunds(1, query.trim(), 30)
        .then(items => { if (active) setResults(items); })
        .catch(error => { if (active) toast.error(errorMessage(error, "חיפוש קרנות נכשל")); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [canEdit, query]);

  const keys = new Set(selected.map(item => item.externalKey));
  const dirty = settings && (settings.selectedKeys.length !== selected.length ||
    settings.selectedKeys.some(key => !keys.has(key)));

  async function save() {
    setSaving(true);
    try {
      await employersApi.updateEmployerDefaultFunds(organizationId, employerId, selected.map(item => item.externalKey));
      await refresh();
      toast.success("קרנות ברירת המחדל של המעסיק נשמרו");
    } catch (error) {
      toast.error(errorMessage(error, "שמירת קרנות ברירת המחדל נכשלה"));
    } finally { setSaving(false); }
  }

  async function reset() {
    setSaving(true);
    try {
      await employersApi.resetEmployerDefaultFunds(organizationId, employerId);
      await refresh();
      setQuery("");
      toast.success("רשימת הקרנות חזרה לברירת המחדל של ALPHA");
    } catch (error) { toast.error(errorMessage(error, "איפוס הקרנות נכשל")); }
    finally { setSaving(false); }
  }

  return <section className="profile-form-section" aria-label="קרנות ברירת מחדל למעסיק">
    <div className="card-head"><div>
      <h3>קרנות ברירת מחדל למעסיק</h3>
      <span style={{ color: "var(--color-text-muted)" }}>
        {settings?.overridden ? "רשימה מותאמת למעסיק" : "ברירת המחדל של ALPHA"} · ניתן לבחור כמה קרנות פנסיה
      </span>
    </div></div>
    <p>בהתחלה מוצגות הקרנות הנבחרות של המערכת. שינוי יישמר רק למעסיק הזה; איפוס יחזיר את הרשימה העדכנית של ALPHA.</p>
    {loading ? <p role="status">טוען קרנות...</p> : !settings ? <p>לא ניתן לטעון את רשימת הקרנות.</p> : <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBlock: 12 }}>
        {selected.length ? selected.map(item => <span key={item.externalKey} className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {item.fundName} · {item.companyName}
          {canEdit ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`הסר את ${item.fundName}`}
            disabled={saving} onClick={() => setSelected(current => current.filter(fund => fund.externalKey !== item.externalKey))}><X size={14} /></button> : null}
        </span>) : <span style={{ color: "var(--color-text-muted)" }}>לא נבחרו קרנות</span>}
      </div>
      {canEdit ? <>
        <div className="field">
          <label htmlFor="employer-default-fund-search">הוספת קרן פנסיה</label>
          <UiInput id="employer-default-fund-search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם הקרן, יצרן או קוד קופה" disabled={saving} />
          {searching ? <small>מחפש קרנות...</small> : null}
          {query.trim() && results.length ? <div style={{ display: "grid", gap: 6, maxHeight: 230, overflowY: "auto", marginTop: 8 }}>
            {results.filter(fund => !keys.has(fund.externalKey)).map(fund =>
              <button key={fund.externalKey} type="button" className="btn btn-secondary" style={{ justifyContent: "flex-start", whiteSpace: "normal" }}
                onClick={() => { setSelected(current => [...current, { externalKey: fund.externalKey, fundName: fund.fundName, companyName: fund.companyName }]); setQuery(""); }}>
                <Plus size={15} />{fund.fundName} · {fund.companyName}
              </button>)}
          </div> : null}
        </div>
        <div className="form-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {settings.overridden || dirty ? <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => void reset()}>
            <RotateCcw size={16} />איפוס לברירת המחדל של המערכת
          </button> : null}
          <button type="button" className="btn btn-primary" disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? "שומר..." : "שמירת רשימת הקרנות"}
          </button>
        </div>
      </> : null}
    </>}
  </section>;
}
