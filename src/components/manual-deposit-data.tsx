"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, X } from "lucide-react";
import { manualDepositsApi, type ManualDepositRow } from "@/lib/manual-deposits-api";
import type { ContributionComponent, ManualContributionInput, ManualProductInput, PensionProductType } from "@/lib/types";

const productNames: Record<number, string> = { 1: "קרן פנסיה", 2: "קרן השתלמות", 3: "ביטוח מנהלים", 4: "קופת גמל", 99: "אחר" };
const contributionLabels: Record<number, string> = { 1: "פיצויים", 2: "תגמולים", 3: "אכ״ע", 4: "שונות" };

export function ManualDepositData({ organizationId, employerId, reportId }: { organizationId: string; employerId: string; reportId: string }) {
  const [rows, setRows] = useState<ManualDepositRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualDepositRow | null>(null);

  async function load() {
    setLoading(true); setError("");
    try { setRows((await manualDepositsApi.list(organizationId, employerId, reportId, query, 0, 100)).items); }
    catch (err) { setError(err instanceof Error ? err.message : "טעינת נתוני ההפקדות נכשלה"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [organizationId, employerId, reportId]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalDeposit || 0), 0), [rows]);

  return <>
    <div className="card-head deposit-head">
      <div><h2>נתוני ההפקדות</h2><span style={{ color: "var(--muted)" }}>כל שורה מייצגת מוצר פנסיוני של עובד. לחצו עריכה כדי לעדכן את פרטי המוצר וההפקדות.</span></div>
      <div className="deposit-summary"><span className="badge badge-blue">{rows.length} שורות</span><span className="badge badge-green">סה״כ ₪{total.toLocaleString("he-IL")}</span></div>
    </div>
    <div className="toolbar deposit-toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="עובד, ת״ז או מספר פוליסה" /></div><button className="btn btn-soft" onClick={() => void load()}>חיפוש</button></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{error}</div> : null}
    {loading ? <div className="empty">טוען נתוני הפקדות...</div> : rows.length === 0 ? <div className="empty"><b>אין עדיין נתוני הפקדות</b><span>חזרו לרשימת העובדים והוסיפו לפחות מוצר אחד.</span></div> : <div className="deposit-table-wrap"><table className="deposit-table"><thead><tr><th>עובד / מוצר</th><th>מס׳ פוליסה</th><th>סכום הפקדה</th><th>חודש שכר</th><th>שכר</th><th>סוג דיווח</th><th>רובד</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.employeeName}</b><span>{productNames[row.productType] ?? "מוצר"} · ת״ז {row.nationalId}</span></td><td>{row.policyNumber || "—"}</td><td>₪{Number(row.totalDeposit).toLocaleString("he-IL")}</td><td>{row.salaryMonth?.slice(0, 7)}</td><td>₪{Number(row.salary).toLocaleString("he-IL")}</td><td>{row.reportingType}</td><td>{row.salaryLayer}</td><td><button className="icon-button" aria-label="עריכה" onClick={() => setEditing(row)}><Pencil size={17} /></button></td></tr>)}</tbody></table></div>}
    {editing ? <DepositEditor organizationId={organizationId} employerId={employerId} reportId={reportId} row={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} /> : null}
  </>;
}

function normalize(items: Array<{ component: ContributionComponent; amount: number; percentage: number; exemptPayments: number }>): ManualContributionInput[] {
  const keys: ContributionComponent[] = [1, 2, 3, 4];
  return keys.map((component) => {
    const found = items.find((x) => Number(x.component) === component);
    return found ? { component, amount: Number(found.amount), percentage: Number(found.percentage), exemptPayments: Number(found.exemptPayments) } : { component, amount: 0, percentage: 0, exemptPayments: 0 };
  });
}

function DepositEditor({ organizationId, employerId, reportId, row, onClose, onSaved }: { organizationId: string; employerId: string; reportId: string; row: ManualDepositRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const [products, setProducts] = useState<ManualProductInput[] | null>(null);
  const [target, setTarget] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    manualDepositsApi.employee(organizationId, employerId, reportId, row.reportEmployeeId).then((detail) => {
      const mapped = detail.products.map((p) => ({
        productType: Number(p.productType) as PensionProductType,
        policyNumber: p.policyNumber,
        salaryMonth: p.salaryMonth,
        salary: Number(p.salary),
        reportingType: p.reportingType,
        salaryLayer: p.salaryLayer,
        section14: p.section14,
        section14StartDate: p.section14StartDate,
        employerContributions: normalize(p.employerContributions),
        employeeContributions: normalize(p.employeeContributions),
      }));
      setProducts(mapped);
      setTarget(detail.products.findIndex((p) => p.id === row.id));
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת השורה נכשלה"));
  }, [organizationId, employerId, reportId, row.id, row.reportEmployeeId]);

  const product = products && target >= 0 ? products[target] : null;
  function patch(patchValue: Partial<ManualProductInput>) { if (!products || target < 0) return; setProducts(products.map((p, i) => i === target ? { ...p, ...patchValue } : p)); }
  function contribution(party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) {
    if (!products || target < 0) return;
    setProducts(products.map((p, i) => i !== target ? p : { ...p, [party]: p[party].map((c) => c.component === component ? { ...c, [key]: value } : c) }));
  }

  async function save() {
    if (!products) return;
    setSaving(true); setError("");
    try { await manualDepositsApi.saveEmployee(organizationId, employerId, reportId, row.reportEmployeeId, products); await onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : "שמירת נתוני ההפקדה נכשלה"); setSaving(false); }
  }

  return <div className="report-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="report-modal deposit-editor-modal" role="dialog" aria-modal="true">
    <div className="report-modal-header"><div><h2>עריכת נתוני הפקדה</h2><span>{row.employeeName} · {productNames[row.productType] ?? "מוצר"}</span></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div>
    <div className="report-modal-body">{error ? <div className="notice notice-error">{error}</div> : !product ? <div className="empty">טוען...</div> : <>
      <div className="deposit-editor-grid">
        <div className="field"><label>מס׳ פוליסה</label><input value={product.policyNumber} onChange={(e) => patch({ policyNumber: e.target.value })} /></div>
        <div className="field"><label>חודש שכר</label><input type="month" value={product.salaryMonth.slice(0,7)} onChange={(e) => patch({ salaryMonth: `${e.target.value}-01` })} /></div>
        <div className="field"><label>שכר</label><input type="number" min="0" value={product.salary || ""} onChange={(e) => patch({ salary: Number(e.target.value) })} /></div>
        <div className="field"><label>סוג דיווח</label><select value={product.reportingType} onChange={(e) => patch({ reportingType: e.target.value })}><option>שוטף</option><option>הפרשים</option><option>תיקון</option><option>שלילי</option></select></div>
        <div className="field"><label>רובד שכר</label><select value={product.salaryLayer} onChange={(e) => patch({ salaryLayer: e.target.value })}><option>רובד 1</option><option>רובד 2</option><option>רובד 3</option></select></div>
        <label className="section14-check"><input type="checkbox" checked={product.section14} onChange={(e) => patch({ section14: e.target.checked })} />סעיף 14</label>
      </div>
      <ContributionCards title="הפקדות מעסיק" items={product.employerContributions} onChange={(component,key,value) => contribution("employerContributions", component, key, value)} />
      <ContributionCards title="הפקדות עובד" items={product.employeeContributions} onChange={(component,key,value) => contribution("employeeContributions", component, key, value)} />
    </>}</div>
    <div className="report-modal-footer"><button className="btn btn-secondary" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={saving || !product} onClick={() => void save()}>{saving ? "שומר..." : "אישור"}</button></div>
  </div></div>;
}

function ContributionCards({ title, items, onChange }: { title: string; items: ManualContributionInput[]; onChange: (component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void }) {
  return <section className="contribution-section"><h3>{title}</h3><div className="mobile-contribution-grid">{items.map((item) => <div className="mobile-contribution-card" key={item.component}><b>{contributionLabels[item.component]}</b><label><span>סכום</span><input type="number" min="0" value={item.amount || ""} onChange={(e) => onChange(item.component, "amount", Number(e.target.value))} /></label><label><span>אחוז</span><input type="number" min="0" step="0.01" value={item.percentage || ""} onChange={(e) => onChange(item.component, "percentage", Number(e.target.value))} /></label><label><span>תשלומים פטורים</span><input type="number" min="0" value={item.exemptPayments || ""} onChange={(e) => onChange(item.component, "exemptPayments", Number(e.target.value))} /></label></div>)}</div></section>;
}
