"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Pencil, Plus, Save, Search, Trash2, UserPlus, X } from "lucide-react";
import { InlineEmployeeCreateModal } from "@/components/inline-employee-create-modal";
import { PensionFundSelect } from "@/components/pension-fund-select";
import { SalaryLayerSelect } from "@/components/salary-layer-select";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { validateProducts } from "@/lib/validation";
import type {
  ContributionComponent,
  Employee,
  ManualContributionInput,
  ManualProductInput,
  ManualReportEmployeeDetail,
  ManualReportEmployeeSummary,
  PensionProductType,
  SalaryAllocationType,
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
  { value: 1, label: "קרן פנסיה" },
  { value: 2, label: "קרן השתלמות" },
  { value: 3, label: "ביטוח מנהלים" },
  { value: 4, label: "קופת גמל" },
  { value: 99, label: "אחר" },
];

const allocationTypes: { value: SalaryAllocationType; label: string }[] = [
  { value: 1, label: "שכר קבוע" },
  { value: 2, label: "אחוז מהשכר" },
  { value: 3, label: "עד תקרה" },
  { value: 4, label: "יתרת שכר" },
];

const components: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "פיצויים" },
  { value: 2, label: "תגמולים" },
  { value: 3, label: "אכ״ע" },
  { value: 4, label: "שונות" },
];

const employeeComponents: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "תג 45 שכיר" },
  { value: 2, label: "תג 47 עצמאי" },
  { value: 3, label: "אכ״ע" },
  { value: 4, label: "שונות" },
];

function emptyContribution(component: ContributionComponent): ManualContributionInput {
  return { component, amount: 0, percentage: 0, exemptPayments: 0 };
}

function emptyProduct(month: string, order: number): ManualProductInput {
  return {
    productType: 1,
    policyNumber: "",
    fundExternalKey: "",
    fundCode: "",
    fundName: "",
    fundCompanyName: "",
    salaryMonth: `${month}-01`,
    salary: 0,
    salaryAllocationType: 1,
    salaryAllocationValue: null,
    allocationOrder: order,
    reportingType: "1",
    salaryLayer: "1",
    section14: false,
    section14StartDate: null,
    employerContributions: components.map((item) => emptyContribution(item.value)),
    employeeContributions: components.map((item) => emptyContribution(item.value)),
  };
}

function maxPercentage(productType: PensionProductType, party: "employer" | "employee", component: ContributionComponent) {
  if (component === 4) return 100;
  if (party === "employer") {
    if (component === 1) return 8.33;
    if (component === 2) return 7.5;
    if (component === 3) return 2.5;
  }
  if (party === "employee" && component === 2) return productType === 2 ? 2.5 : 7;
  return 100;
}

function snapshotEmployee(row: ManualReportEmployeeSummary): Employee {
  return {
    id: row.employmentId,
    personId: row.personId,
    nationalId: row.nationalId,
    firstName: row.firstName,
    lastName: row.lastName,
    employeeNumber: row.employeeNumber,
    monthlySalary: row.monthlySalary,
    status: 1,
    startDate: "",
    endDate: null,
  };
}

function matchesEmployee(employee: Employee, search: string) {
  const term = search.trim().toLowerCase();
  return !term || `${employee.firstName} ${employee.lastName} ${employee.nationalId} ${employee.employeeNumber}`.toLowerCase().includes(term);
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000;
}

function amountFromPercentage(salary: number, percentage: number) {
  return roundMoney(Math.max(0, salary) * Math.max(0, percentage) / 100);
}

function percentageFromAmount(salary: number, amount: number) {
  return salary > 0 ? roundPercentage(Math.max(0, amount) / salary * 100) : 0;
}

function recalcContributions(items: ManualContributionInput[], salary: number) {
  return items.map((item) => ({ ...item, amount: amountFromPercentage(salary, Number(item.percentage || 0)) }));
}

function resolveReportProducts(monthlySalary: number, products: ManualProductInput[]) {
  const salaries = new Map<number, number>();
  if (products.length && monthlySalary <= 0) return { products, error: "יש להזין שכר חודשי לעובד לפני חישוב המוצרים." };

  const indexed = products.map((product, index) => ({ product, index }));
  const remainderItems = indexed.filter(({ product }) => Number(product.salaryAllocationType ?? 1) === 4);
  if (remainderItems.length > 1) return { products, error: "אפשר להגדיר מוצר אחד בלבד בשיטת יתרת שכר." };

  const ordered = [
    ...indexed.filter(({ product }) => Number(product.salaryAllocationType ?? 1) !== 4),
    ...remainderItems,
  ];

  let allocated = 0;
  for (const { product, index } of ordered) {
    const type = Number(product.salaryAllocationType ?? 1) as SalaryAllocationType;
    const value = Number(product.salaryAllocationValue ?? (type === 1 ? product.salary : 0));
    if (type !== 4 && (!Number.isFinite(value) || value <= 0))
      return { products, error: `מוצר ${index + 1}: יש להזין ערך הקצאת שכר גדול מאפס.` };
    if (type === 2 && value > 100)
      return { products, error: `מוצר ${index + 1}: אחוז מהשכר לא יכול לעבור 100%.` };

    const insuredSalary = type === 1
      ? value
      : type === 2
        ? roundMoney(monthlySalary * value / 100)
        : type === 3
          ? Math.min(monthlySalary, value)
          : Math.max(monthlySalary - allocated, 0);

    if (allocated + insuredSalary > monthlySalary + 0.01)
      return { products, error: "הקצאות השכר חורגות מהשכר החודשי של העובד." };

    allocated += insuredSalary;
    salaries.set(index, insuredSalary);
  }

  const allocationOrderByIndex = new Map<number, number>();
  ordered.forEach(({ index }, order) => allocationOrderByIndex.set(index, order));

  return {
    products: products.map((product, index) => {
      const salary = salaries.get(index) ?? 0;
      return {
        ...product,
        salary,
        salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType,
        salaryAllocationValue: Number(product.salaryAllocationType ?? 1) === 4 ? null : Number(product.salaryAllocationValue ?? product.salary ?? 0),
        allocationOrder: allocationOrderByIndex.get(index) ?? index,
        employerContributions: recalcContributions(product.employerContributions, salary),
        employeeContributions: recalcContributions(product.employeeContributions, salary),
      };
    }),
    error: "",
  };
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
    if (showLoading) setLoading(true);
    setError("");
    const [employeeResult, reportResult] = await Promise.allSettled([
      alphaApi.employeeSearch(organizationId, employerId, search, 0, 100),
      alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100),
    ]);
    const reportRows = reportResult.status === "fulfilled" ? reportResult.value.items : [];
    if (reportResult.status === "fulfilled") setRows(reportRows);
    if (employeeResult.status === "fulfilled" && employeeResult.value.items.length > 0) {
      setVisibleEmployees(employeeResult.value.items);
    } else {
      const fromProps = employees.filter((employee) => matchesEmployee(employee, search));
      setVisibleEmployees(fromProps.length ? fromProps : reportRows.map(snapshotEmployee));
    }
    if (employeeResult.status === "rejected" && reportResult.status === "rejected") {
      const message = (employeeResult.reason instanceof Error ? employeeResult.reason.message : "") || (reportResult.reason instanceof Error ? reportResult.reason.message : "") || "טעינת רשימת העובדים נכשלה";
      setError(message);
      notify.error(message);
    } else if (reportResult.status === "rejected") {
      const message = reportResult.reason instanceof Error ? reportResult.reason.message : "טעינת נתוני העובדים בדיווח נכשלה";
      setError(message);
      notify.error(message);
    }
    if (showLoading) setLoading(false);
  }

  async function loadRows(search = "") {
    try {
      const result = await alphaApi.manualReportEmployees(organizationId, employerId, reportId, search, 0, 100);
      setRows(result.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : "טעינת עובדי הדיווח נכשלה";
      setError(message);
      notify.error(message);
    }
  }

  useEffect(() => {
    setQuery("");
    setVisibleEmployees(employees);
    void loadList("", true);
  }, [organizationId, employerId, reportId, employees]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (loading) return;
      setSearching(true);
      await loadList(query.trim(), false);
      setSearching(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, organizationId, employerId, reportId]);

  const rowByEmployment = useMemo(() => new Map(rows.map((row) => [row.employmentId, row])), [rows]);

  async function flushSelectionQueue() {
    if (selectionSyncRunning.current) return;
    selectionSyncRunning.current = true;
    setSyncing(true);
    try {
      while (selectionQueue.current) {
        const ids = selectionQueue.current;
        selectionQueue.current = null;
        await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, ids);
      }
      await loadRows(query.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "עדכון העובדים בדיווח נכשל";
      setError(message);
      notify.error(message);
    } finally {
      selectionSyncRunning.current = false;
      setSyncing(false);
      if (selectionQueue.current) void flushSelectionQueue();
    }
  }

  function queueSelection(next: string[]) {
    selectionQueue.current = next;
    void flushSelectionQueue();
  }

  function changeSelection(employeeId: string, checked: boolean) {
    const current = selectedIdsRef.current;
    const next = checked ? Array.from(new Set([...current, employeeId])) : current.filter((id) => id !== employeeId);
    selectedIdsRef.current = next;
    setSelectedIds(next);
    if (!checked) setRows((existing) => existing.filter((row) => row.employmentId !== employeeId));
    setError("");
    queueSelection(next);
  }

  function selectAllVisibleActive() {
    const ids = visibleEmployees.filter((item) => item.status === 1).map((item) => item.id);
    const next = Array.from(new Set([...selectedIdsRef.current, ...ids]));
    selectedIdsRef.current = next;
    setSelectedIds(next);
    setError("");
    queueSelection(next);
  }

  async function employeeCreated(employee: Employee) {
    setVisibleEmployees((current) => [employee, ...current.filter((item) => item.id !== employee.id)]);
    const next = Array.from(new Set([...selectedIdsRef.current, employee.id]));
    selectedIdsRef.current = next;
    setSelectedIds(next);
    await alphaApi.syncManualReportEmployees(organizationId, employerId, reportId, next);
    await loadList(query.trim(), false);
  }

  async function editEmployee(row: ManualReportEmployeeSummary) {
    setError("");
    try {
      setEditing(await alphaApi.manualReportEmployee(organizationId, employerId, reportId, row.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "טעינת פרטי העובד נכשלה";
      setError(message);
      notify.error(message);
    }
  }

  const ready = rows.filter((row) => row.validationStatus === "ready").length;

  return <>
    <div className="card-head manual-report-head">
      <div><h2>עובדים בדיווח</h2><span style={{ color: "var(--muted)" }}>בחרו עובד וערכו את השכר החודשי, הקופה וחלוקת השכר בין המוצרים.</span></div>
      <div className="manual-report-badges"><span className="badge badge-blue">{selectedIds.length} עובדים</span><span className="badge badge-green">{ready} הושלמו</span></div>
    </div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div> : null}
    <div className="toolbar manual-report-toolbar">
      <div className="search"><Search size={17} /><input value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, ת״ז או מספר עובד" /></div>
      <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}><UserPlus size={16} />הקמת עובד חדש</button>
      <button className="btn btn-soft" disabled={!visibleEmployees.some((item) => item.status === 1)} onClick={selectAllVisibleActive}>{syncing ? "מעדכן..." : "בחירת כל הפעילים בתוצאות"}</button>
    </div>
    <div className="manual-employee-list">
      {loading || searching ? <div className="empty">{searching ? "מחפש עובדים..." : "טוען את עובדי המעסיק..."}</div> : visibleEmployees.length === 0 ? <div className="empty"><b>לא נמצאו עובדים</b></div> : visibleEmployees.map((employee) => {
        const selected = selectedIds.includes(employee.id);
        const row = rowByEmployment.get(employee.id);
        return <div className={`manual-employee-row${selected ? " selected" : ""}`} key={employee.id}>
          <label className="manual-employee-check"><input type="checkbox" checked={selected} onChange={(event) => changeSelection(employee.id, event.target.checked)} /></label>
          <div className="manual-employee-main"><b>{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · עובד {employee.employeeNumber}{row?.monthlySalary ? ` · ₪${Number(row.monthlySalary).toLocaleString("he-IL")}` : ""}</span></div>
          <div className="manual-employee-products">{selected && row ? row.productCount ? <span className="badge badge-green"><CircleCheck size={13} />{row.productCount} מוצרים</span> : <span className="badge badge-orange"><CircleAlert size={13} />חסר תמהיל/מוצרים</span> : selected ? <span className="badge badge-gray">שומר...</span> : <span className="badge badge-gray">לא בדיווח</span>}</div>
          <button className="btn btn-soft manual-edit-btn" disabled={!selected || !row} onClick={() => row && void editEmployee(row)}><Pencil size={16} />עריכה</button>
        </div>;
      })}
    </div>
    {showCreate ? <InlineEmployeeCreateModal organizationId={organizationId} employerId={employerId} onClose={() => setShowCreate(false)} onCreated={employeeCreated} /> : null}
    {editing ? <EmployeeProductsModal employee={editing} month={month} onClose={() => setEditing(null)} onSave={async (monthlySalary, products) => {
      await alphaApi.saveManualReportEmployee(organizationId, employerId, reportId, editing.id, monthlySalary, products);
      setEditing(null);
      await loadRows(query.trim());
      notify.success("נתוני העובד והקצאות השכר נשמרו בהצלחה");
    }} /> : null}
  </>;
}

function EmployeeProductsModal({ employee, month, onClose, onSave }: { employee: ManualReportEmployeeDetail; month: string; onClose: () => void; onSave: (monthlySalary: number, products: ManualProductInput[]) => Promise<void>; }) {
  const [monthlySalary, setMonthlySalary] = useState(Number(employee.monthlySalary || 0));
  const [products, setProducts] = useState<ManualProductInput[]>(() => employee.products.map((product, index) => ({
    productType: Number(product.productType) as PensionProductType,
    policyNumber: product.policyNumber,
    fundExternalKey: product.fundExternalKey ?? "",
    fundCode: product.fundCode ?? "",
    fundName: product.fundName ?? "",
    fundCompanyName: product.fundCompanyName ?? "",
    salaryMonth: product.salaryMonth,
    salary: Number(product.salary),
    salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType,
    salaryAllocationValue: Number(product.salaryAllocationType ?? 1) === 4 ? null : Number(product.salaryAllocationValue ?? product.salary),
    allocationOrder: index,
    reportingType: product.reportingType,
    salaryLayer: product.salaryLayer || "1",
    section14: product.section14,
    section14StartDate: product.section14StartDate,
    employerContributions: normalizeContributions(product.employerContributions),
    employeeContributions: normalizeContributions(product.employeeContributions),
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const resolved = useMemo(() => resolveReportProducts(monthlySalary, products), [monthlySalary, products]);

  function updateProduct(index: number, patch: Partial<ManualProductInput>) {
    setProducts((current) => current.map((product, i) => i === index ? { ...product, ...patch } : product));
    setError("");
  }

  function updateContribution(productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    const salary = Number(resolved.products[productIndex]?.salary || 0);
    setProducts((current) => current.map((product, index) => index !== productIndex ? product : {
      ...product,
      [party]: product[party].map((item) => {
        if (item.component !== component) return item;
        if (key === "percentage") return { ...item, percentage: roundPercentage(safeValue), amount: amountFromPercentage(salary, safeValue) };
        if (key === "amount") return { ...item, amount: roundMoney(safeValue), percentage: percentageFromAmount(salary, safeValue) };
        return { ...item, exemptPayments: roundMoney(safeValue) };
      }),
    }));
    setError("");
  }

  async function save() {
    if (resolved.error) { setError(resolved.error); notify.error(resolved.error); return; }
    if (resolved.products.some((product) => product.productType !== 99 && !(product.fundExternalKey ?? "").trim())) {
      const message = "יש לבחור קופה לכל מוצר פנסיוני.";
      setError(message);
      notify.error(message);
      return;
    }
    const errors = validateProducts(resolved.products);
    if (errors.length) {
      const message = errors.join(" ");
      setError(message);
      notify.error(message);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(monthlySalary, resolved.products);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שמירת נתוני העובד נכשלה";
      setError(message);
      notify.error(message);
      setSaving(false);
    }
  }

  const totalDeposits = resolved.products.reduce((sum, product) => sum + [...product.employerContributions, ...product.employeeContributions].reduce((subtotal, contribution) => subtotal + Number(contribution.amount || 0), 0), 0);

  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="report-modal" role="dialog" aria-modal="true">
      <div className="report-modal-header">
        <div><h2>עריכת מוצרים לעובד</h2><b className="report-modal-employee">{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · מספר עובד {employee.employeeNumber}</span></div>
        <button className="icon-button" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="report-modal-body">
        {error || resolved.error ? <div className="notice notice-error">{error || resolved.error}</div> : null}
        <div className="employee-report-summary"><div><span>חודש דיווח</span><b>{month}</b></div><div><span>מספר מוצרים</span><b>{products.length}</b></div><div><span>סה״כ הפקדות</span><b>₪{totalDeposits.toLocaleString("he-IL")}</b></div></div>
        <div className="field" style={{ marginBottom: 10 }}><label>שכר חודשי של העובד בדיווח *</label><input type="number" min="0.01" max="10000000" step="0.01" value={monthlySalary || ""} onChange={(event) => { setMonthlySalary(Number(event.target.value)); setError(""); }} /></div>
        <div className="contribution-guidance">המערכת מחשבת את חלוקת השכר לפי שיטת ההקצאה. מוצר מסוג “יתרת שכר” תמיד מקבל בסוף את כל יתרת השכר שלא הוקצתה למוצרים האחרים.</div>
        <div className="product-editor-list">{resolved.products.map((product, index) => <ProductEditor key={index} index={index} product={product} rawProduct={products[index]} updateProduct={updateProduct} updateContribution={updateContribution} remove={() => setProducts((current) => current.filter((_, i) => i !== index))} />)}{!products.length ? <div className="empty"><div>עדיין לא הוגדרו מוצרים לעובד בדיווח הזה.</div></div> : null}</div>
        <button className="btn btn-soft wide" onClick={() => setProducts((current) => [...current, emptyProduct(month, current.length)])}><Plus size={15} />הוספת מוצר</button>
      </div>
      <div className="report-modal-footer"><button className="btn btn-secondary" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={15} />{saving ? "שומר..." : "שמירת נתוני העובד"}</button></div>
    </div>
  </div>;
}

function normalizeContributions(items: Array<{ component: ContributionComponent; amount: number; percentage: number; exemptPayments: number }>): ManualContributionInput[] {
  return components.map(({ value }) => {
    const found = items.find((item) => Number(item.component) === value);
    return found ? { component: value, amount: Number(found.amount), percentage: Number(found.percentage), exemptPayments: Number(found.exemptPayments) } : emptyContribution(value);
  });
}

function ProductEditor({ index, product, rawProduct, updateProduct, updateContribution, remove }: {
  index: number;
  product: ManualProductInput;
  rawProduct: ManualProductInput;
  updateProduct: (index: number, patch: Partial<ManualProductInput>) => void;
  updateContribution: (productIndex: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void;
  remove: () => void;
}) {
  const allocationType = Number(rawProduct.salaryAllocationType ?? 1) as SalaryAllocationType;
  return <section className="report-product-card">
    <div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{productTypes.find((item) => item.value === product.productType)?.label ?? "מוצר פנסיוני"}</b></div><button className="icon-button danger" onClick={remove}><Trash2 size={16} /></button></div>
    <div className="grid report-product-fields">
      <div className="field"><label>סוג מוצר *</label><select value={rawProduct.productType} onChange={(event) => updateProduct(index, { productType: Number(event.target.value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
      <PensionFundSelect productType={rawProduct.productType} value={rawProduct} onChange={(fund) => updateProduct(index, fund)} />
      <div className="field"><label>מספר פוליסה *</label><input required maxLength={100} value={rawProduct.policyNumber} onChange={(event) => updateProduct(index, { policyNumber: event.target.value })} /></div>
      <div className="field"><label>חודש שכר *</label><input required type="month" value={rawProduct.salaryMonth.slice(0, 7)} onChange={(event) => updateProduct(index, { salaryMonth: `${event.target.value}-01` })} /></div>
      <div className="field"><label>שיטת הקצאת שכר *</label><select value={allocationType} onChange={(event) => { const type = Number(event.target.value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: type, salaryAllocationValue: type === 4 ? null : rawProduct.salaryAllocationValue ?? rawProduct.salary ?? 0 }); }}>{allocationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
      <div className="field"><label>{allocationType === 2 ? "אחוז מהשכר" : allocationType === 3 ? "תקרת שכר" : allocationType === 4 ? "ערך הקצאה" : "שכר קבוע"}</label><input disabled={allocationType === 4} type="number" min="0" max={allocationType === 2 ? 100 : undefined} step="0.01" value={allocationType === 4 ? "" : rawProduct.salaryAllocationValue ?? ""} placeholder={allocationType === 4 ? "מחושב אוטומטית" : undefined} onChange={(event) => updateProduct(index, { salaryAllocationValue: Number(event.target.value) })} /></div>
      <div className="field"><label>סוג תקבול 006 *</label><EmployerInterfaceOptionSelect category="receipt-type" value={Number(rawProduct.reportingType) || null} required onChange={(value) => updateProduct(index, { reportingType: value == null ? "" : String(value) })} /></div>
      <div className="field"><label>רובד שכר *</label><SalaryLayerSelect value={rawProduct.salaryLayer} onChange={(value) => updateProduct(index, { salaryLayer: value })} /></div>
      <label className="section14-check"><input type="checkbox" checked={rawProduct.section14} onChange={(event) => updateProduct(index, { section14: event.target.checked, section14StartDate: event.target.checked ? rawProduct.section14StartDate : null })} /><span>סעיף 14</span></label>
      <div className="field"><label>תאריך תחילת סעיף 14{rawProduct.section14 ? " *" : ""}</label><input required={rawProduct.section14} type="date" disabled={!rawProduct.section14} value={rawProduct.section14StartDate ?? ""} onChange={(event) => updateProduct(index, { section14StartDate: event.target.value || null })} /></div>
    </div>
    <div className="contribution-grid">
      <ContributionTable title="הפקדות מעסיק" salary={product.salary} productType={product.productType} party="employer" items={product.employerContributions} onChange={(component, key, value) => updateContribution(index, "employerContributions", component, key, value)} />
      <ContributionTable title="הפקדות עובד" salary={product.salary} productType={product.productType} party="employee" items={product.employeeContributions} onChange={(component, key, value) => updateContribution(index, "employeeContributions", component, key, value)} />
    </div>
  </section>;
}

function ContributionTable({ title, salary, productType, party, items, onChange }: {
  title: string;
  salary: number;
  productType: PensionProductType;
  party: "employer" | "employee";
  items: ManualContributionInput[];
  onChange: (component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void;
}) {
  const labels = party === "employee" ? employeeComponents : components;
  return <div className="contribution-section">
    <h3>{title}</h3>
    <div className="contribution-table-wrap"><table className="contribution-table">
      <thead><tr><th>רכיב</th><th>סכום</th><th>אחוז</th><th>תשלומים פטורים</th></tr></thead>
      <tbody>{labels.map(({ value, label }) => {
        const item = items.find((entry) => entry.component === value) ?? emptyContribution(value);
        const max = maxPercentage(productType, party, value);
        return <tr key={value}>
          <th>{label}</th>
          <td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.amount || ""} onChange={(event) => onChange(value, "amount", Number(event.target.value))} /></td>
          <td><input inputMode="decimal" type="number" min="0" max={max} step="0.0001" value={item.percentage || ""} onChange={(event) => onChange(value, "percentage", Number(event.target.value))} /></td>
          <td><input inputMode="decimal" type="number" min="0" step="0.01" value={item.exemptPayments || ""} onChange={(event) => onChange(value, "exemptPayments", Number(event.target.value))} /></td>
        </tr>;
      })}</tbody>
    </table></div>
  </div>;
}
