"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Pencil, Plus, Save, Search, Trash2, UserPlus, X } from "lucide-react";
import { InlineEmployeeCreateModal } from "@/components/inline-employee-create-modal";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { validateProducts } from "@/lib/validation";
import type { ContributionComponent, Employee, ManualContributionInput, ManualProductInput, ManualReportEmployeeDetail, ManualReportEmployeeSummary, PensionProductType, SalaryAllocationType } from "@/lib/types";

type Props = { organizationId: string; employerId: string; reportId: string; month: string; employees: Employee[]; selectedIds: string[]; setSelectedIds: (ids: string[]) => void; };

const productTypes: { value: PensionProductType; label: string }[] = [
  { value: 1, label: "קרן פנסיה" }, { value: 2, label: "קרן השתלמות" }, { value: 3, label: "ביטוח מנהלים" }, { value: 4, label: "קופת גמל" }, { value: 99, label: "אחר" },
];
const allocationTypes: { value: SalaryAllocationType; label: string }[] = [
  { value: 1, label: "שכר קבוע" }, { value: 2, label: "אחוז מהשכר" }, { value: 3, label: "עד תקרה" }, { value: 4, label: "יתרת שכר" },
];
const components: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "פיצויים" }, { value: 2, label: "תגמולים" }, { value: 3, label: "אכ״ע" }, { value: 4, label: "שונות" },
];
function emptyContribution(component: ContributionComponent): ManualContributionInput { return { component, amount: 0, percentage: 0, exemptPayments: 0 }; }
function emptyProduct(month: string, order: number): ManualProductInput { return { productType: 1, policyNumber: "", salaryMonth: `${month}-01`, salary: 0, salaryAllocationType: 1, salaryAllocationValue: 0, allocationOrder: order, reportingType: "שוטף", salaryLayer: "רובד 1", section14: false, section14StartDate: null, employerContributions: components.map((x) => emptyContribution(x.value)), employeeContributions: components.map((x) => emptyContribution(x.value)) }; }
function maxPercentage(productType: PensionProductType, party: "employer" | "employee", component: ContributionComponent) { if (component === 4) return 100; if (party === "employer") { if (component === 1) return 8.33; if (component === 2) return 7.5; if (component === 3) return 2.5; } if (party === "employee" && component === 2) return productType === 2 ? 2.5 : 7; return 100; }
function snapshotEmployee(row: ManualReportEmployeeSummary): Employee { return { id: row.employmentId, personId: row.personId, nationalId: row.nationalId, firstName: row.firstName, lastName: row.lastName, employeeNumber: row.employeeNumber, status: 1, startDate: "", endDate: null }; }
function matchesEmployee(employee: Employee, search: string) { const term = search.trim().toLowerCase(); if (!term) return true; return `${employee.firstName} ${employee.lastName} ${employee.nationalId} ${employee.employeeNumber}`.toLowerCase().includes(term); }
function roundMoney(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }
function roundPercentage(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000; }
function amountFromPercentage(salary: number, percentage: number) { return roundMoney(Math.max(0, salary) * Math.max(0, percentage) / 100); }
function percentageFromAmount(salary: number, amount: number) { return salary > 0 ? roundPercentage(Math.max(0, amount) / salary * 100) : 0; }
function recalculateProductAmounts(product: ManualProductInput, salary: number): ManualProductInput {
  const nextSalary = roundMoney(Math.max(0, Number.isFinite(salary) ? salary : 0));
  const recalc = (items: ManualContributionInput[]) => items.map((item) => ({ ...item, amount: amountFromPercentage(nextSalary, Number(item.percentage || 0)) }));
  return { ...product, salary: nextSalary, employerContributions: recalc(product.employerContributions), employeeContributions: recalc(product.employeeContributions) };
}
function normalizeContributions(items: Array<{ component: ContributionComponent; amount: number; percentage: number; exemptPayments: number }>): ManualContributionInput[] { return components.map(({ value }) => { const found = items.find((item) => Number(item.component) === value); return found ? { component: value, amount: Number(found.amount), percentage: Number(found.percentage), exemptPayments: Number(found.exemptPayments) } : emptyContribution(value); }); }
function allocationValueLabel(type: SalaryAllocationType) { if (type === 2) return "אחוז מהשכר (%)"; if (type === 3) return "תקרת שכר (₪)"; return "שכר קבוע (₪)"; }

function calculateAllocations(products: ManualProductInput[], monthlySalary: number): { products: ManualProductInput[]; error: string } {
  const salary = roundMoney(Math.max(0, Number(monthlySalary) || 0));
  const remainderCount = products.filter((product) => Number(product.salaryAllocationType ?? 1) === 4).length;
  if (remainderCount > 1) return { products, error: "ניתן להגדיר מוצר אחד בלבד כיתרת שכר." };

  const ordered = products.map((product, index) => ({ product, index, order: Number(product.allocationOrder ?? index) }))
    .sort((a, b) => a.order - b.order || a.index - b.index);
  const result = [...products];
  let allocated = 0;
  for (const entry of ordered) {
    const type = Number(entry.product.salaryAllocationType ?? 1) as SalaryAllocationType;
    const value = Number(entry.product.salaryAllocationValue ?? 0);
    if (type !== 4 && value <= 0) return { products, error: "יש להזין ערך חיובי לשכר קבוע, אחוז מהשכר או תקרה." };
    if (type === 2 && value > 100) return { products, error: "אחוז מהשכר לא יכול להיות גבוה מ־100%." };
    const remaining = Math.max(0, salary - allocated);
    let insuredSalary = 0;
    if (type === 1) insuredSalary = value;
    else if (type === 2) insuredSalary = roundMoney(salary * value / 100);
    else if (type === 3) insuredSalary = Math.min(remaining, value);
    else insuredSalary = remaining;
    if (type !== 4 && allocated + insuredSalary > salary + 0.01) return { products, error: "חלוקת השכר בין המוצרים גבוהה מהשכר החודשי של העובד." };
    allocated = roundMoney(allocated + insuredSalary);
    result[entry.index] = recalculateProductAmounts({ ...entry.product, allocationOrder: entry.order, salaryAllocationType: type, salaryAllocationValue: type === 4 ? null : value }, insuredSalary);
  }
  return { products: result, error: "" };
}

export function ManualReportData({ organizationId, employerId, reportId, month, employees, selectedIds, setSelectedIds }: Props) {
  const [rows, setRows] = useState<ManualReportEmployeeSummary[]>([]);
  const [visibleEmployees, setVisibleEmployees] = useState<Employee[]>(employees);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ManualReportEmployeeDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const selectionQueue = useRef<string[] | null>(null);
  const selectionSyncRunning = useRef(false);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  async function loadList(search = "", showLoading = true) {
    if (showLoading) setLoading(true); setError("");
    const [employeeResult, reportResult] = await Promise.allSettled([
      alphaApi.employeeSearch(organizationId, employerId, search, 0, 100), alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100),
    ]);
    const reportRows = reportResult.status === "fulfilled" ? reportResult.value.items : [];
    if (reportResult.status === "fulfilled") setRows(reportRows);
    if (employeeResult.status === "fulfilled" && employeeResult.value.items.length > 0) setVisibleEmployees(employeeResult.value.items);
    else { const fromProps = employees.filter((employee) => matchesEmployee(employee, search)); if (fromProps.length > 0) setVisibleEmployees(fromProps); else setVisibleEmployees(reportRows.map(snapshotEmployee)); }
    if (employeeResult.status === "rejected" && reportResult.status === "rejected") { const employeeError = employeeResult.reason instanceof Error ? employeeResult.reason.message : ""; const reportError = reportResult.reason instanceof Error ? reportResult.reason.message : ""; const message = employeeError || reportError || "טעינת רשימת העובדים נכשלה"; setError(message); notify.error(message); }
    else if (reportResult.status === "rejected") { const message = reportResult.reason instanceof Error ? reportResult.reason.message : "טעינת נתוני העובדים בדיווח נכשלה"; setError(message); notify.error(message); }
    if (showLoading) setLoading(false);
  }
  async function loadRows(search = "") { try { const result = await alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100); setRows(result.items); if (visibleEmployees.length === 0 && result.items.length > 0) setVisibleEmployees(result.items.map(snapshotEmployee)); } catch (err) { const message = err instanceof Error ? err.message : "טעינת עובדי הדיווח נכשלה"; setError(message); notify.error(message); } }
  useEffect(() => { setQuery(""); setVisibleEmployees(employees); void loadList("", true); }, [organizationId, employerId, reportId, employees]);
  useEffect(() => { const timer = window.setTimeout(async () => { if (loading) return; setSearching(true); await loadList(query.trim(), false); setSearching(false); }, 300); return () => window.clearTimeout(timer); }, [query, organizationId, employerId, reportId]);
  const rowByEmployment = useMemo(() => new Map(rows.map((row) => [row.employmentId, row])), [rows]);

  async function flushSelectionQueue() {
    if (selectionSyncRunning.current) return; selectionSyncRunning.current = true; setSyncing(true);
    try { while (selectionQueue.current) { const ids = selectionQueue.current; selectionQueue.current = null; await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, ids); } await loadRows(query.trim()); }
    catch (err) { const message = err instanceof Error ? err.message : "עדכון העובדים בדיווח נכשל"; setError(message); notify.error(message); }
    finally { selectionSyncRunning.current = false; setSyncing(false); if (selectionQueue.current) void flushSelectionQueue(); }
  }
  function queueSelection(next: string[]) { selectionQueue.current = next; void flushSelectionQueue(); }
  function changeSelection(employeeId: string, checked: boolean) { const current = selectedIdsRef.current; const next = checked ? Array.from(new Set([...current, employeeId])) : current.filter((id) => id !== employeeId); selectedIdsRef.current = next; setSelectedIds(next); if (!checked) setRows((existing) => existing.filter((row) => row.employmentId !== employeeId)); setError(""); queueSelection(next); }
  function selectAllVisibleActive() { const ids = visibleEmployees.filter((x) => x.status === 1).map((x) => x.id); const next = Array.from(new Set([...selectedIdsRef.current, ...ids])); selectedIdsRef.current = next; setSelectedIds(next); setError(""); queueSelection(next); }
  async function employeeCreated(employee: Employee) { setVisibleEmployees((current) => [employee, ...current.filter((x) => x.id !== employee.id)]); const next = Array.from(new Set([...selectedIdsRef.current, employee.id])); selectedIdsRef.current = next; setSelectedIds(next); await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, next); await loadList(query.trim(), false); }
  async function editEmployee(row: ManualReportEmployeeSummary) { setError(""); try { setEditing(await alphaApi.manualReportEmployee(organizationId, employerId, reportId, row.id)); } catch (err) { const message = err instanceof Error ? err.message : "טעינת פרטי העובד נכשלה"; setError(message); notify.error(message); } }

  const ready = rows.filter((row) => row.validationStatus === "ready").length;
  return <>
    <div className="card-head manual-report-head"><div><h2>עובדים בדיווח</h2><span style={{ color: "var(--muted)" }}>בחרו עובדים קיימים או הקימו עובד חדש בלי לצאת מהדיווח.</span></div><div className="manual-report-badges"><span className="badge badge-blue">{selectedIds.length} עובדים</span><span className="badge badge-green">{ready} הושלמו</span></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div> : null}
    <div className="toolbar manual-report-toolbar"><div className="search"><Search size={17} /><input value={query} maxLength={80} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, ת״ז או מספר עובד" /></div><button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}><UserPlus size={16} />הקמת עובד חדש</button><button className="btn btn-soft" disabled={!visibleEmployees.some((x) => x.status === 1)} onClick={selectAllVisibleActive}>{syncing ? "מעדכן..." : "בחירת כל הפעילים בתוצאות"}</button></div>
    <div className="manual-employee-list">{loading || searching ? <div className="empty">{searching ? "מחפש עובדים..." : "טוען את עובדי המעסיק..."}</div> : visibleEmployees.length === 0 ? <div className="empty"><b>לא נמצאו עובדים</b><span>אפשר להקים עובד חדש ישירות מתוך הדיווח.</span></div> : visibleEmployees.map((employee) => { const selected = selectedIds.includes(employee.id); const row = rowByEmployment.get(employee.id); return <div className={`manual-employee-row${selected ? " selected" : ""}`} key={employee.id}><label className="manual-employee-check"><input type="checkbox" checked={selected} onChange={(e) => changeSelection(employee.id, e.target.checked)} /></label><div className="manual-employee-main"><b>{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · עובד {employee.employeeNumber}{row?.monthlySalary ? ` · שכר ₪${Number(row.monthlySalary).toLocaleString("he-IL")}` : ""}</span></div><div className="manual-employee-products">{selected && row ? <>{row.productCount && row.monthlySalary > 0 ? <span className="badge badge-green"><CircleCheck size={13} />{row.productCount} מוצרים</span> : <span className="badge badge-orange"><CircleAlert size={13} />חסר שכר/תמהיל</span>}</> : selected ? <span className="badge badge-gray">שומר...</span> : <span className="badge badge-gray">לא בדיווח</span>}</div><button className="btn btn-soft manual-edit-btn" disabled={!selected || !row} onClick={() => row && void editEmployee(row)}><Pencil size={16} />עריכה</button></div>; })}</div>
    {showCreate ? <InlineEmployeeCreateModal organizationId={organizationId} employerId={employerId} onClose={() => setShowCreate(false)} onCreated={employeeCreated} /> : null}
    {editing ? <EmployeeProductsModal employee={editing} month={month} onClose={() => setEditing(null)} onSave={async (monthlySalary, products) => { await alphaApi.saveManualReportEmployee(organizationId, employerId, reportId, editing.id, monthlySalary, products); setEditing(null); await loadRows(query.trim()); notify.success("נתוני העובד והקצאות השכר נשמרו בהצלחה"); }} /> : null}
  </>;
}

function EmployeeProductsModal({ employee, month, onClose, onSave }: { employee: ManualReportEmployeeDetail; month: string; onClose: () => void; onSave: (monthlySalary: number, products: ManualProductInput[]) => Promise<void>; }) {
  const initialSalary = Number(employee.monthlySalary || 0) || roundMoney(employee.products.reduce((sum, product) => sum + Number(product.salary || 0), 0));
  const [monthlySalary, setMonthlySalary] = useState(initialSalary);
  const [products, setProducts] = useState<ManualProductInput[]>(() => employee.products.map((product, index) => ({ productType: Number(product.productType) as PensionProductType, policyNumber: product.policyNumber, salaryMonth: product.salaryMonth, salary: Number(product.salary), salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType, salaryAllocationValue: product.salaryAllocationValue == null ? Number(product.salary) : Number(product.salaryAllocationValue), allocationOrder: Number(product.allocationOrder ?? index), reportingType: product.reportingType, salaryLayer: product.salaryLayer, section14: product.section14, section14StartDate: product.section14StartDate, employerContributions: normalizeContributions(product.employerContributions), employeeContributions: normalizeContributions(product.employeeContributions) })));
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  function applyAllocationRules(nextProducts: ManualProductInput[], nextSalary = monthlySalary) {
    const allocation = calculateAllocations(nextProducts, nextSalary);
    setProducts(allocation.products);
    setError(allocation.error);
  }
  function changeMonthlySalary(value: number) { const salary = roundMoney(Math.max(0, Number.isFinite(value) ? value : 0)); setMonthlySalary(salary); applyAllocationRules(products, salary); }
  function updateProduct(index: number, patch: Partial<ManualProductInput>) { const next = products.map((product, i) => i === index ? { ...product, ...patch } : product); applyAllocationRules(next); }
  function removeProduct(index: number) { applyAllocationRules(products.filter((_, i) => i !== index).map((product, i) => ({ ...product, allocationOrder: product.allocationOrder ?? i }))); }
  function addProduct() { applyAllocationRules([...products, emptyProduct(month, products.length)]); }
  function updateContribution(productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    setProducts((current) => current.map((product, index) => {
      if (index !== productIndex) return product;
      return { ...product, [party]: product[party].map((item) => {
        if (item.component !== component) return item;
        if (key === "percentage") { const percentage = roundPercentage(safeValue); return { ...item, percentage, amount: amountFromPercentage(Number(product.salary), percentage) }; }
        if (key === "amount") { const amount = roundMoney(safeValue); return { ...item, amount, percentage: percentageFromAmount(Number(product.salary), amount) }; }
        return { ...item, exemptPayments: roundMoney(safeValue) };
      }) };
    }));
    setError("");
  }
  async function save() {
    if (monthlySalary <= 0) { setError("יש להזין שכר חודשי לעובד."); return; }
    const allocation = calculateAllocations(products, monthlySalary);
    if (allocation.error) { setError(allocation.error); notify.error(allocation.error); return; }
    const errors = validateProducts(allocation.products);
    if (errors.length) { const message = errors.join(" "); setError(message); notify.error(message); return; }
    setSaving(true); setError("");
    try { await onSave(monthlySalary, allocation.products); }
    catch (err) { const message = err instanceof Error ? err.message : "שמירת נתוני העובד נכשלה"; setError(message); notify.error(message); setSaving(false); }
  }
  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="report-modal" role="dialog" aria-modal="true" aria-label={`עריכת מוצרים לעובד ${employee.firstName} ${employee.lastName}`}><div className="report-modal-header"><div><h2>עריכת מוצרים לעובד</h2><b className="report-modal-employee">{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · מספר עובד {employee.employeeNumber}</span></div><button className="icon-button" onClick={onClose} aria-label="סגירה"><X size={18} /></button></div><div className="report-modal-body">{error ? <div className="notice notice-error">{error}</div> : null}<div className="employee-report-summary"><div><span>חודש דיווח</span><b>{month}</b></div><div><span>מספר מוצרים</span><b>{products.length}</b></div><div><span>סה״כ הפקדות</span><b>₪{roundMoney(products.reduce((sum, product) => sum + [...product.employerContributions, ...product.employeeContributions].reduce((s, c) => s + Number(c.amount || 0), 0), 0)).toLocaleString("he-IL")}</b></div></div><div className="field" style={{ marginBottom: 16 }}><label>שכר חודשי של העובד *</label><input type="number" min="0.01" step="0.01" value={monthlySalary || ""} onChange={(e) => changeMonthlySalary(Number(e.target.value))} /><span style={{ color: "var(--muted)" }}>זהו שכר העובד לחודש. השכר המבוטח בכל מוצר מחושב לפי חוק ההקצאה שלו.</span></div><div className="contribution-guidance">שכר מבוטח מחושב אוטומטית לפי שכר העובד וחוק ההקצאה. ההפקדות מחושבות לפי שכר מבוטח × אחוז. אפשר לערוך סכום הפקדה ידנית והאחוז יתעדכן בחזרה.</div><div className="product-editor-list">{products.map((product, index) => <ProductEditor key={index} index={index} product={product} updateProduct={updateProduct} updateContribution={updateContribution} remove={() => removeProduct(index)} />)}{!products.length ? <div className="empty"><div>עדיין לא הוגדרו מוצרים לעובד בדיווח הזה.</div></div> : null}</div><button className="btn btn-soft wide" onClick={addProduct}><Plus size={15} />הוספת מוצר</button></div><div className="report-modal-footer"><button className="btn btn-secondary" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={15} />{saving ? "שומר..." : "שמירת נתוני העובד"}</button></div></div></div>;
}

function ProductEditor({ index, product, updateProduct, updateContribution, remove }: { index: number; product: ManualProductInput; updateProduct: (index: number, patch: Partial<ManualProductInput>) => void; updateContribution: (productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void; remove: () => void; }) {
  const allocationType = Number(product.salaryAllocationType ?? 1) as SalaryAllocationType;
  return <section className="report-product-card"><div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{productTypes.find((x) => x.value === product.productType)?.label ?? "מוצר פנסיוני"}</b></div><button className="icon-button danger" onClick={remove} aria-label="מחיקת מוצר"><Trash2 size={16} /></button></div><div className="grid report-product-fields"><div className="field"><label>סוג מוצר *</label><select value={product.productType} onChange={(e) => updateProduct(index, { productType: Number(e.target.value) as PensionProductType })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div><div className="field"><label>מספר פוליסה *</label><input required maxLength={100} value={product.policyNumber} onChange={(e) => updateProduct(index, { policyNumber: e.target.value })} /></div><div className="field"><label>חודש שכר *</label><input required type="month" value={product.salaryMonth.slice(0, 7)} onChange={(e) => updateProduct(index, { salaryMonth: `${e.target.value}-01` })} /></div><div className="field"><label>שיטת הקצאת שכר *</label><select value={allocationType} onChange={(e) => { const type = Number(e.target.value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: type, salaryAllocationValue: type === 4 ? null : product.salaryAllocationValue ?? 0 }); }}>{allocationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>{allocationType !== 4 ? <div className="field"><label>{allocationValueLabel(allocationType)} *</label><input type="number" min="0" max={allocationType === 2 ? 100 : undefined} step="0.01" value={product.salaryAllocationValue ?? ""} onChange={(e) => updateProduct(index, { salaryAllocationValue: Number(e.target.value) })} /></div> : <div className="field"><label>ערך הקצאה</label><input disabled value="מחושב מהיתרה" /></div>}<div className="field"><label>סדר חישוב</label><input type="number" min="0" step="1" value={product.allocationOrder ?? index} onChange={(e) => updateProduct(index, { allocationOrder: Number(e.target.value) })} /></div><div className="field"><label>שכר מבוטח מחושב</label><input disabled value={`₪${Number(product.salary || 0).toLocaleString("he-IL")}`} /></div><div className="field"><label>סוג דיווח *</label><select value={product.reportingType} onChange={(e) => updateProduct(index, { reportingType: e.target.value })}><option>שוטף</option><option>הפרשים</option><option>תיקון</option><option>שלילי</option></select></div><div className="field"><label>רובד שכר *</label><select value={product.salaryLayer} onChange={(e) => updateProduct(index, { salaryLayer: e.target.value })}><option>רובד 1</option><option>רובד 2</option><option>רובד נוסף</option></select></div><label className="section14-check"><input type="checkbox" checked={product.section14} onChange={(e) => updateProduct(index, { section14: e.target.checked, section14StartDate: e.target.checked ? product.section14StartDate : null })} /><span>סעיף 14</span></label><div className="field"><label>תאריך תחילת סעיף 14{product.section14 ? " *" : ""}</label><input required={product.section14} type="date" disabled={!product.section14} value={product.section14StartDate ?? ""} onChange={(e) => updateProduct(index, { section14StartDate: e.target.value || null })} /></div></div><div className="contribution-grid"><ContributionTable title="הפקדות מעסיק" salary={product.salary} productType={product.productType} party="employer" items={product.employerContributions} onChange={(component, key, value) => updateContribution(index, "employerContributions", component, key, value)} /><ContributionTable title="הפקדות עובד" salary={product.salary} productType={product.productType} party="employee" items={product.employeeContributions} onChange={(component, key, value) => updateContribution(index, "employeeContributions", component, key, value)} /></div></section>;
}
function ContributionTable({ title, salary, productType, party, items, onChange }: { title: string; salary: number; productType: PensionProductType; party: "employer" | "employee"; items: ManualContributionInput[]; onChange: (component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void; }) { return <div className="contribution-section"><h3>{title}</h3><div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>רכיב</th><th>סכום</th><th>אחוז</th><th>פטורים</th></tr></thead><tbody>{components.map(({ value, label }) => { const item = items.find((x) => x.component === value) ?? emptyContribution(value); const max = maxPercentage(productType, party, value); return <tr key={value}><th>{label}</th><td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.amount || ""} onChange={(e) => onChange(value, "amount", Number(e.target.value))} title={salary > 0 ? "אפשר לערוך ידנית; האחוז יתעדכן אוטומטית" : "השכר המבוטח במוצר הוא 0"} /></td><td><input inputMode="decimal" type="number" min="0" max={max} step="0.0001" value={item.percentage || ""} onChange={(e) => onChange(value, "percentage", Number(e.target.value))} title={`מקסימום ${max}% · שינוי האחוז מחשב את הסכום`} /></td><td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.exemptPayments || ""} onChange={(e) => onChange(value, "exemptPayments", Number(e.target.value))} /></td></tr>; })}</tbody></table></div></div>; }
