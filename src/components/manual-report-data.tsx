"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Pencil, Save, Search, UserPlus, X } from "lucide-react";
import { InlineEmployeeCreateModal } from "@/components/inline-employee-create-modal";
import { PensionProductsEditor, normalizePensionEditorProducts, validatePensionEditorProducts, type PensionEditorProduct } from "@/components/pension-products-editor";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import type { Employee, ManualProductInput, ManualReportEmployeeDetail, ManualReportEmployeeSummary, PensionProductType, SalaryAllocationType, Section14Code } from "@/lib/types";

type Props = {
  organizationId: string;
  employerId: string;
  reportId: string;
  month: string;
  employees: Employee[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
};

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

function toEditorProduct(product: ManualProductInput, index: number): PensionEditorProduct {
  return {
    productType: Number(product.productType) as PensionProductType,
    policyNumber: product.policyNumber,
    fundExternalKey: product.fundExternalKey ?? "",
    fundCode: product.fundCode ?? "",
    fundName: product.fundName ?? "",
    fundCompanyName: product.fundCompanyName ?? "",
    salaryMonth: product.salaryMonth,
    salary: Number(product.salary || 0),
    salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType,
    salaryAllocationValue: Number(product.salaryAllocationType ?? 1) === 4 ? null : Number(product.salaryAllocationValue ?? product.salary ?? 0),
    allocationOrder: Number(product.allocationOrder ?? index),
    reportingType: product.reportingType,
    salaryLayer: product.salaryLayer || "1",
    section14: product.section14,
    section14Code: product.section14Code == null ? undefined : Number(product.section14Code) as Section14Code,
    section14StartDate: product.section14StartDate,
    employerContributions: product.employerContributions.map((entry) => ({
      component: entry.component,
      amount: Number(entry.amount || 0),
      percentage: Number(entry.percentage || 0),
      exemptPayments: Number(entry.exemptPayments || 0),
    })),
    employeeContributions: product.employeeContributions.map((entry) => ({
      component: entry.component,
      amount: Number(entry.amount || 0),
      percentage: Number(entry.percentage || 0),
      exemptPayments: Number(entry.exemptPayments || 0),
    })),
  };
}

function toManualProduct(product: PensionEditorProduct, month: string): ManualProductInput {
  return {
    productType: product.productType,
    policyNumber: product.policyNumber,
    fundExternalKey: product.fundExternalKey ?? "",
    fundCode: product.fundCode ?? "",
    fundName: product.fundName ?? "",
    fundCompanyName: product.fundCompanyName ?? "",
    salaryMonth: product.salaryMonth || `${month.slice(0, 7)}-01`,
    salary: Number(product.salary || 0),
    salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType,
    salaryAllocationValue: product.salaryAllocationValue ?? null,
    allocationOrder: Number(product.allocationOrder ?? 0),
    reportingType: product.reportingType,
    salaryLayer: product.salaryLayer,
    section14: product.section14,
    section14Code: product.section14Code,
    section14StartDate: product.section14StartDate,
    employerContributions: product.employerContributions.map((entry) => ({
      component: entry.component,
      amount: Number(entry.amount || 0),
      percentage: Number(entry.percentage || 0),
      exemptPayments: Number(entry.exemptPayments || 0),
    })),
    employeeContributions: product.employeeContributions.map((entry) => ({
      component: entry.component,
      amount: Number(entry.amount || 0),
      percentage: Number(entry.percentage || 0),
      exemptPayments: Number(entry.exemptPayments || 0),
    })),
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
  const [products, setProducts] = useState<PensionEditorProduct[]>(() => employee.products.map(toEditorProduct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const normalized = normalizePensionEditorProducts(monthlySalary, products);
    const validationError = normalized.error || validatePensionEditorProducts(normalized.products, "report");
    if (validationError) {
      setError(validationError);
      notify.error(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(monthlySalary, normalized.products.map((product) => toManualProduct(product, month)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "שמירת נתוני העובד נכשלה";
      setError(message);
      notify.error(message);
      setSaving(false);
    }
  }

  const totalDeposits = products.reduce((sum, product) => sum + [...product.employerContributions, ...product.employeeContributions].reduce((subtotal, contribution) => subtotal + Number(contribution.amount || 0), 0), 0);

  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="report-modal" role="dialog" aria-modal="true">
      <div className="report-modal-header">
        <div><h2>עריכת מוצרים לעובד</h2><b className="report-modal-employee">{employee.firstName} {employee.lastName}</b><span>ת״ז {employee.nationalId} · מספר עובד {employee.employeeNumber}</span></div>
        <button className="icon-button" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="report-modal-body">
        {error ? <div className="notice notice-error">{error}</div> : null}
        <div className="employee-report-summary"><div><span>חודש דיווח</span><b>{month}</b></div><div><span>מספר מוצרים</span><b>{products.length}</b></div><div><span>סה״כ הפקדות</span><b>₪{totalDeposits.toLocaleString("he-IL")}</b></div></div>
        <PensionProductsEditor
          context="report"
          month={month}
          monthlySalary={monthlySalary}
          products={products}
          onMonthlySalaryChange={(value) => { setMonthlySalary(value); setError(""); }}
          onProductsChange={(value) => { setProducts(value); setError(""); }}
        />
      </div>
      <div className="report-modal-footer"><button className="btn btn-secondary" onClick={onClose}>ביטול</button><button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={15} />{saving ? "שומר..." : "שמירת נתוני העובד"}</button></div>
    </div>
  </div>;
}
