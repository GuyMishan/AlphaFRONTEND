"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { alphaApi } from "@/lib/api";
import type {
  ContributionComponent,
  Employee,
  ManualContributionInput,
  ManualProductInput,
  ManualReportEmployeeDetail,
  ManualReportEmployeeSummary,
  PensionProductType,
} from "@/lib/types";

type Props = {
  organizationId: string;
  employerId: string;
  reportId: string;
  month: string;
  employees: Employee[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
};

const productTypes: { value: PensionProductType; label: string }[] = [
  { value: 1, label: "קרן פנסיה" }, { value: 2, label: "קרן השתלמות" }, { value: 3, label: "ביטוח מנהלים" }, { value: 4, label: "קופת גמל" }, { value: 99, label: "אחר" },
];
const components: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "פיצויים" }, { value: 2, label: "תגמולים" }, { value: 3, label: "אכ״ע" }, { value: 4, label: "שונות" },
];

function emptyContribution(component: ContributionComponent): ManualContributionInput { return { component, amount: 0, percentage: 0, exemptPayments: 0 }; }
function emptyProduct(month: string): ManualProductInput { return { productType: 1, policyNumber: "", salaryMonth: `${month}-01`, salary: 0, reportingType: "שוטף", salaryLayer: "רובד 1", section14: false, section14StartDate: null, employerContributions: components.map((x) => emptyContribution(x.value)), employeeContributions: components.map((x) => emptyContribution(x.value)) }; }

export function ManualReportData({ organizationId, employerId, reportId, month, employees, selectedIds, setSelectedIds }: Props) {
  const [rows, setRows] = useState<ManualReportEmployeeSummary[]>([]);
  const [visibleEmployees, setVisibleEmployees] = useState<Employee[]>(employees);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualReportEmployeeDetail | null>(null);

  async function loadRows(showLoading = true, search = "") {
    if (showLoading) setLoading(true);
    try {
      const result = await alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100);
      setRows(result.items);
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת עובדי הדיווח נכשלה"); }
    finally { if (showLoading) setLoading(false); }
  }

  useEffect(() => { setVisibleEmployees(employees); void loadRows(true, ""); }, [organizationId, employerId, reportId, employees]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const search = query.trim();
        const [employeeResult, reportResult] = await Promise.all([
          alphaApi.employeeSearch(organizationId, employerId, search, 0, 100),
          alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100),
        ]);
        setVisibleEmployees(employeeResult.items);
        setRows(reportResult.items);
      } catch (err) { setError(err instanceof Error ? err.message : "חיפוש העובדים נכשל"); }
      finally { setSearching(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, organizationId, employerId, reportId]);

  const rowByEmployment = useMemo(() => new Map(rows.map((row) => [row.employmentId, row])), [rows]);

  async function changeSelection(employeeId: string, checked: boolean) {
    const previousIds = selectedIds; const previousRows = rows;
    const next = checked ? Array.from(new Set([...selectedIds, employeeId])) : selectedIds.filter((id) => id !== employeeId);
    setSelectedIds(next);
    if (!checked) setRows((current) => current.filter((row) => row.employmentId !== employeeId));
    setSyncing(true); setError("");
    try { await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, next); await loadRows(false, query.trim()); }
    catch (err) { setSelectedIds(previousIds); setRows(previousRows); setError(err instanceof Error ? err.message : "עדכון העובדים בדיווח נכשל"); }
    finally { setSyncing(false); }
  }

  async function editEmployee(row: ManualReportEmployeeSummary) {
    setError("");
    try { setEditing(await alphaApi.manualReportEmployee(organizationId, employerId, reportId, row.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "טעינת פרטי העובד נכשלה"); }
  }

  const ready = rows.filter((row) => row.validationStatus === "ready").length;
  return <>
    <div className="card-head manual-report-head"><div><h2>עובדים בדיווח</h2><span style={{ color: "var(--muted)" }}>בחרו את העובדים ולחצו עריכה כדי להזין מוצרים והפקדות.</span></div><div className="manual-report-badges"><span className="badge badge-blue">{selectedIds.length} עובדים</span><span className="badge badge-green">{ready} הושלמו</span></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div> : null}
    <div className="toolbar manual-report-toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, ת״ז או מספר עובד" /></div><button className="btn btn-soft" disabled={syncing} onClick={async () => { const ids = employees.filter((x) => x.status === 1).map((x) => x.id); setSelectedIds(ids); setSyncing(true); setError(""); try { await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, ids); await loadRows(false, query.trim()); } catch (err) { setError(err instanceof Error ? err.message : "עדכון העובדים בדיווח נכשל"); } finally { setSyncing(false); } }}>בחירת כל הפעילים</button></div>
    <div className="manual-employee-list">
      {loading || searching ? <div className="empty">{searching ? "מחפש עובדים..." : "טוען את עובדי הדיווח..."}</div> : visibleEmployees.map((employee) => { const selected = selectedIds.includes(employee.id); const row = rowByEmployment.get(employee.id); return <div className={`manual-employee-row${selected ? " selected" : ""}`} key={employee.id}><label className="manual-employee-check"><input type="checkbox" checked={selected} disabled={syncing} onChange={(e) => void changeSelection(employee.id, e.target.checked)} /></label><div className="manual-employee-main"><b>{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · עובד {employee.employeeNumber}</span></div><div className="manual-employee-products">{selected && row ? <>{row.productCount ? <span className="badge badge-green"><CircleCheck size={13} />{row.productCount} מוצרים</span> : <span className="badge badge-orange"><CircleAlert size={13} />חסרים מוצרים</span>}</> : selected ? <span className="badge badge-gray">שומר...</span> : <span className="badge badge-gray">לא בדיווח</span>}</div><button className="btn btn-soft manual-edit-btn" disabled={!selected || !row} onClick={() => row && void editEmployee(row)}><Pencil size={16} />עריכה</button></div>; })}
    </div>
    {editing ? <EmployeeProductsModal employee={editing} month={month} onClose={() => setEditing(null)} onSave={async (products) => { await alphaApi.saveManualReportEmployee(organizationId, employerId, reportId, editing.id, products); setEditing(null); await loadRows(false, query.trim()); }} /> : null}
  </>;
}

function EmployeeProductsModal({ employee, month, onClose, onSave }: { employee: ManualReportEmployeeDetail; month: string; onClose: () => void; onSave: (products: ManualProductInput[]) => Promise<void> }) {
  const [products, setProducts] = useState<ManualProductInput[]>(() => employee.products.map((product) => ({ productType: Number(product.productType) as PensionProductType, policyNumber: product.policyNumber, salaryMonth: product.salaryMonth, salary: Number(product.salary), reportingType: product.reportingType, salaryLayer: product.salaryLayer, section14: product.section14, section14StartDate: product.section14StartDate, employerContributions: normalizeContributions(product.employerContributions), employeeContributions: normalizeContributions(product.employeeContributions) })));
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  function updateProduct(index: number, patch: Partial<ManualProductInput>) { setProducts((current) => current.map((product, i) => i === index ? { ...product, ...patch } : product)); }
  function updateContribution(productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) { setProducts((current) => current.map((product, index) => index !== productIndex ? product : { ...product, [party]: product[party].map((item) => item.component === component ? { ...item, [key]: Number.isFinite(value) ? value : 0 } : item) })); }
  async function save() { setSaving(true); setError(""); try { await onSave(products); } catch (err) { setError(err instanceof Error ? err.message : "שמירת נתוני העובד נכשלה"); setSaving(false); } }
  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="report-modal" role="dialog" aria-modal="true" aria-label={`עריכת ${employee.firstName} ${employee.lastName}`}><div className="report-modal-header"><div><h2>{employee.firstName} {employee.lastName}</h2><span>ת״ז {employee.nationalId} · מספר עובד {employee.employeeNumber}</span></div><button className="icon-button" onClick={onClose} aria-label="סגירה"><X size={20} /></button></div><div className="report-modal-body">{error ? <div className="notice notice-error">{error}</div> : null}<div className="employee-report-summary"><div><span>חודש דיווח</span><b>{month}</b></div><div><span>מספר מוצרים</span><b>{products.length}</b></div><div><span>סה״כ הפקדות</span><b>₪{products.reduce((sum, product) => sum + [...product.employerContributions, ...product.employeeContributions].reduce((s, c) => s + Number(c.amount || 0), 0), 0).toLocaleString("he-IL")}</b></div></div><div className="product-editor-list">{products.map((product, index) => <ProductEditor key={index} index={index} product={product} updateProduct={updateProduct} updateContribution={updateContribution} remove={() => setProducts((current) => current.filter((_, i) => i !== index))} />)}{!products.length ? <div className="empty"><div>עדיין לא הוגדרו מוצרים לעובד בדיווח הזה.</div></div> : null}</div><button className="btn btn-soft wide" onClick={() => setProducts((current) => [...current, emptyProduct(month)])}><Plus size={17} />הוספת מוצר</button></div><div className="report-modal-footer"><button className="btn btn-secondary" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? "שומר..." : "שמירת נתוני העובד"}</button></div></div></div>;
}

function normalizeContributions(items: Array<{ component: ContributionComponent; amount: number; percentage: number; exemptPayments: number }>): ManualContributionInput[] { return components.map(({ value }) => { const found = items.find((item) => Number(item.component) === value); return found ? { component: value, amount: Number(found.amount), percentage: Number(found.percentage), exemptPayments: Number(found.exemptPayments) } : emptyContribution(value); }); }

function ProductEditor({ index, product, updateProduct, updateContribution, remove }: { index: number; product: ManualProductInput; updateProduct: (index: number, patch: Partial<ManualProductInput>) => void; updateContribution: (productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void; remove: () => void; }) {
  return <section className="report-product-card"><div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{productTypes.find((x) => x.value === product.productType)?.label ?? "מוצר פנסיוני"}</b></div><button className="icon-button danger" onClick={remove} aria-label="מחיקת מוצר"><Trash2 size={18} /></button></div><div className="grid report-product-fields"><div className="field"><label>סוג מוצר</label><select value={product.productType} onChange={(e) => updateProduct(index, { productType: Number(e.target.value) as PensionProductType })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div><div className="field"><label>מספר פוליסה</label><input value={product.policyNumber} onChange={(e) => updateProduct(index, { policyNumber: e.target.value })} /></div><div className="field"><label>חודש שכר</label><input type="month" value={product.salaryMonth.slice(0, 7)} onChange={(e) => updateProduct(index, { salaryMonth: `${e.target.value}-01` })} /></div><div className="field"><label>שכר</label><input type="number" min="0" step="0.01" value={product.salary || ""} onChange={(e) => updateProduct(index, { salary: Number(e.target.value) })} /></div><div className="field"><label>סוג דיווח</label><select value={product.reportingType} onChange={(e) => updateProduct(index, { reportingType: e.target.value })}><option>שוטף</option><option>הפרשים</option><option>תיקון</option><option>שלילי</option></select></div><div className="field"><label>רובד שכר</label><select value={product.salaryLayer} onChange={(e) => updateProduct(index, { salaryLayer: e.target.value })}><option>רובד 1</option><option>רובד 2</option><option>רובד נוסף</option></select></div><label className="section14-check"><input type="checkbox" checked={product.section14} onChange={(e) => updateProduct(index, { section14: e.target.checked, section14StartDate: e.target.checked ? product.section14StartDate : null })} /><span>סעיף 14</span></label><div className="field"><label>תאריך תחילת סעיף 14</label><input type="date" disabled={!product.section14} value={product.section14StartDate ?? ""} onChange={(e) => updateProduct(index, { section14StartDate: e.target.value || null })} /></div></div><ContributionTable title="הפקדות מעסיק" items={product.employerContributions} onChange={(component, key, value) => updateContribution(index, "employerContributions", component, key, value)} /><ContributionTable title="הפקדות עובד" items={product.employeeContributions} onChange={(component, key, value) => updateContribution(index, "employeeContributions", component, key, value)} /></section>;
}

function ContributionTable({ title, items, onChange }: { title: string; items: ManualContributionInput[]; onChange: (component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void }) {
  return <div className="contribution-section"><h3>{title}</h3><div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>רכיב</th><th>סכום</th><th>אחוז</th><th>תשלומים פטורים</th></tr></thead><tbody>{components.map(({ value, label }) => { const item = items.find((x) => x.component === value) ?? emptyContribution(value); return <tr key={value}><th>{label}</th><td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.amount || ""} onChange={(e) => onChange(value, "amount", Number(e.target.value))} /></td><td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.percentage || ""} onChange={(e) => onChange(value, "percentage", Number(e.target.value))} /></td><td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.exemptPayments || ""} onChange={(e) => onChange(value, "exemptPayments", Number(e.target.value))} /></td></tr>; })}</tbody></table></div></div>;
}
