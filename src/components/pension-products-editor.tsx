"use client";

import { UiDateInput, UiInput  } from "@/components/ui-controls";
import { CircleAlert, CircleCheck, Plus, Trash2 } from "lucide-react";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { PensionFundSelect } from "@/components/pension-fund-select";
import { ReferenceOptionSelect } from "@/components/reference-option-select";
import { SalaryLayerSelect } from "@/components/salary-layer-select";
import type { ContributionComponent, PensionProductType, SalaryAllocationType, Section14Code } from "@/lib/types";

export type PensionEditorContribution = {
  component: ContributionComponent;
  percentage: number;
  amount?: number;
  exemptPayments?: number;
};

export type PensionEditorProduct = {
  productType: PensionProductType;
  policyNumber: string;
  fundExternalKey?: string;
  fundCode?: string;
  fundName?: string;
  fundCompanyName?: string;
  fundClassification?: string;
  salary: number;
  salaryMonth?: string;
  salaryAllocationType?: SalaryAllocationType;
  salaryAllocationValue?: number | null;
  allocationOrder?: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14Code?: Section14Code;
  section14StartDate: string | null;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  institutionalBody?: string;
  manufacturer?: string;
  employerContributions: PensionEditorContribution[];
  employeeContributions: PensionEditorContribution[];
};

const employerComponents: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "פיצויים" }, { value: 2, label: "תגמולים" }, { value: 3, label: "אכ״ע" }, { value: 4, label: "שונות" },
];
const employeeComponents: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "תג 45 שכיר" }, { value: 2, label: "תג 47 עצמאי" }, { value: 3, label: "אכ״ע" }, { value: 4, label: "שונות" },
];

const today = () => new Date().toISOString().slice(0, 10);
const roundMoney = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const roundPercentage = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000;

export function inferPensionSection14Code(product: Pick<PensionEditorProduct, "section14" | "section14Code" | "section14StartDate">): Section14Code {
  if (product.section14Code && [1, 2, 3, 4, 5].includes(Number(product.section14Code))) return Number(product.section14Code) as Section14Code;
  if (!product.section14 && product.section14StartDate) return 4;
  if (!product.section14) return 3;
  return product.section14StartDate ? 2 : 1;
}

export function resolvePensionAllocations(monthlySalary: number, products: PensionEditorProduct[]) {
  const resolved = new Map<number, number>();
  const active = products.map((product, index) => ({ product, index }))
    .filter(({ product }) => product.isActive !== false)
    .sort((a, b) => Number(a.product.allocationOrder ?? a.index) - Number(b.product.allocationOrder ?? b.index));
  if (!active.length) return { resolved, error: "" };
  if (monthlySalary < 0) return { resolved, error: "שכר חודשי לא יכול להיות שלילי." };
  if (monthlySalary === 0) {
    for (const { index } of active) resolved.set(index, 0);
    return { resolved, error: "" };
  }
  if (active.filter(({ product }) => Number(product.salaryAllocationType ?? 1) === 4).length > 1)
    return { resolved, error: "אפשר להגדיר מוצר אחד בלבד בשיטת יתרת שכר." };
  const orders = active.map(({ product, index }) => Number(product.allocationOrder ?? index));
  if (new Set(orders).size !== orders.length) return { resolved, error: "סדר החישוב חייב להיות ייחודי לכל מוצר פעיל." };

  let allocated = 0;
  for (const { product, index } of active) {
    const type = Number(product.salaryAllocationType ?? 1) as SalaryAllocationType;
    const value = Number(product.salaryAllocationValue ?? (type === 1 ? product.salary : 0));
    if (type !== 4 && (!Number.isFinite(value) || value <= 0)) return { resolved, error: `מוצר ${index + 1}: יש להזין ערך הקצאת שכר גדול מאפס.` };
    if (type === 2 && value > 100) return { resolved, error: `מוצר ${index + 1}: אחוז מהשכר לא יכול לעבור 100%.` };
    const insuredSalary = type === 1 ? value : type === 2 ? roundMoney(monthlySalary * value / 100) : type === 3 ? Math.min(monthlySalary, value) : Math.max(monthlySalary - allocated, 0);
    if (allocated + insuredSalary > monthlySalary + 0.01) return { resolved, error: "הקצאות השכר חורגות מהשכר החודשי של העובד." };
    allocated += insuredSalary;
    resolved.set(index, insuredSalary);
  }
  return { resolved, error: "" };
}

export function normalizePensionEditorProducts(monthlySalary: number, products: PensionEditorProduct[]) {
  const allocation = resolvePensionAllocations(monthlySalary, products);
  return {
    error: allocation.error,
    products: products.map((product, index) => {
      const section14Code = inferPensionSection14Code(product);
      const salary = allocation.resolved.get(index) ?? 0;
      const normalize = (item: PensionEditorContribution): PensionEditorContribution => ({
        ...item,
        amount: roundMoney(salary * Number(item.percentage || 0) / 100),
        exemptPayments: roundMoney(Number(item.exemptPayments || 0)),
      });
      return {
        ...product,
        salary,
        section14Code,
        section14: section14Code === 1 || section14Code === 2,
        section14StartDate: section14Code === 2 || section14Code === 4 ? product.section14StartDate : null,
        allocationOrder: Number(product.allocationOrder ?? index),
        salaryAllocationValue: Number(product.salaryAllocationType ?? 1) === 4 ? null : product.salaryAllocationValue,
        employerContributions: product.employerContributions.map(normalize),
        employeeContributions: product.employeeContributions.map(normalize),
      };
    }),
  };
}

export function validatePensionEditorProducts(products: PensionEditorProduct[], context: "employee" | "report") {
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    if (product.isActive === false) continue;
    if (context === "report" && product.productType === 99) return `מוצר ${index + 1}: סוג מוצר "אחר" אינו נתמך בממשק מעסיקים 006. יש לבחור סוג קופה רשמי.`;
    if (product.productType !== 99 && !(product.fundExternalKey ?? "").trim()) return `מוצר ${index + 1}: יש לבחור קופה.`;
    if (!/^\d+$/.test(product.reportingType || "")) return `מוצר ${index + 1}: יש לבחור סוג תקבול תקין.`;
    if (!/^\d+$/.test(product.salaryLayer || "")) return `מוצר ${index + 1}: יש לבחור רובד שכר תקין.`;
    const code = inferPensionSection14Code(product);
    if ((code === 2 || code === 4) && !product.section14StartDate) return `מוצר ${index + 1}: יש להזין תאריך תחולה/ביטול לסעיף 14.`;
    if (context === "employee") {
      if (!product.effectiveFrom) return `מוצר ${index + 1}: יש להזין תאריך תחילת תוקף.`;
      if (product.effectiveTo && product.effectiveFrom && product.effectiveTo < product.effectiveFrom) return `מוצר ${index + 1}: תאריך סיום לא יכול להיות מוקדם מתאריך תחילת התוקף.`;
    }
  }
  return "";
}

export function createEmptyPensionEditorProduct(context: "employee" | "report", order: number, month?: string): PensionEditorProduct {
  const base: PensionEditorProduct = {
    productType: 1, policyNumber: "", fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "", fundClassification: "", salary: 0,
    salaryAllocationType: 1, salaryAllocationValue: null, allocationOrder: order, reportingType: "1", salaryLayer: "1", section14: false,
    section14Code: 3, section14StartDate: null, employerContributions: employerComponents.map(({ value }) => ({ component: value, percentage: 0, amount: 0, exemptPayments: 0 })),
    employeeContributions: employeeComponents.map(({ value }) => ({ component: value, percentage: 0, amount: 0, exemptPayments: 0 })),
  };
  if (context === "employee") return { ...base, isActive: true, effectiveFrom: today(), effectiveTo: null, institutionalBody: "", manufacturer: "" };
  return { ...base, salaryMonth: month ? `${month.slice(0, 7)}-01` : today().slice(0, 7) + "-01" };
}

function allocationValueLabel(type: SalaryAllocationType) {
  if (type === 2) return "אחוז מהשכר (%)";
  if (type === 3) return "תקרת שכר (₪)";
  return "שכר קבוע (₪)";
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

export function PensionProductsEditor({ context, month, monthlySalary, products, editable = true, showAllocationError = true, onMonthlySalaryChange, onProductsChange }: {
  context: "employee" | "report";
  month?: string;
  monthlySalary: number;
  products: PensionEditorProduct[];
  editable?: boolean;
  showAllocationError?: boolean;
  onMonthlySalaryChange: (value: number) => void;
  onProductsChange: (products: PensionEditorProduct[]) => void;
}) {
  const allocation = resolvePensionAllocations(monthlySalary, products);
  const updateProduct = (index: number, patch: Partial<PensionEditorProduct>) => onProductsChange(products.map((product, i) => i === index ? { ...product, ...patch } : product));
  const updateContribution = (index: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => {
    const salary = allocation.resolved.get(index) ?? 0;
    onProductsChange(products.map((product, i) => i !== index ? product : {
      ...product,
      [party]: product[party].map((item) => {
        if (item.component !== component) return item;
        const safe = Math.max(0, Number.isFinite(value) ? value : 0);
        if (key === "percentage") return { ...item, percentage: roundPercentage(safe), amount: roundMoney(salary * safe / 100) };
        if (key === "amount") return { ...item, amount: roundMoney(safe), percentage: salary > 0 ? roundPercentage(safe / salary * 100) : 0 };
        return { ...item, exemptPayments: roundMoney(safe) };
      }),
    }));
  };

  return <>
    <div className="grid two-cols" style={{ marginBottom: 12 }}>
      <div className="field"><label>{context === "report" ? "שכר חודשי של העובד בדיווח *" : "שכר חודשי של העובד *"}</label><UiInput disabled={!editable} type="number" min="0" max="10000000" step="0.01" value={monthlySalary || ""} onChange={(e) => onMonthlySalaryChange(Number(e.target.value))} /></div>
      <div className="field"><label>סה״כ שכר מבוטח מחושב</label><UiInput disabled value={`₪${Array.from(allocation.resolved.values()).reduce((sum, value) => sum + value, 0).toLocaleString("he-IL")}`} /></div>
    </div>
    {showAllocationError && allocation.error ? <div className="notice notice-error" style={{ marginBottom: 12 }}>{allocation.error}</div> : null}
    <div className="product-editor-list">{products.map((product, index) => {
      const allocationType = Number(product.salaryAllocationType ?? 1) as SalaryAllocationType;
      const section14Code = inferPensionSection14Code(product);
      const section14DateRequired = section14Code === 2 || section14Code === 4;
      const insuredSalary = allocation.resolved.get(index) ?? 0;
      return <section className="report-product-card" key={index} style={{ opacity: product.isActive === false ? .72 : 1 }}>
        <div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{product.fundName || "מוצר פנסיוני"}</b></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}>{product.isActive === false ? <span className="badge badge-gray">לא פעיל</span> : <span className="status-pill-active"><CircleCheck size={13} /><span>פעיל</span></span>}{editable ? <button className="icon-button danger" onClick={() => onProductsChange(products.filter((_, i) => i !== index))} aria-label="מחיקת מוצר"><Trash2 size={16} /></button> : null}</div></div>
        <div className="grid report-product-fields">
          {context === "employee" ? <div className="field"><label>סטטוס מוצר</label><ReferenceOptionSelect category="product-active-status" disabled={!editable} value={product.isActive === false ? "inactive" : "active"} onChange={(value) => updateProduct(index, { isActive: value === "active" })} /></div> : null}
          <div className="field"><label>סוג מוצר *</label><ReferenceOptionSelect category="pension-product-type" disabled={!editable} value={product.productType} required onChange={(value) => updateProduct(index, { productType: Number(value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "", fundClassification: "" })} /></div>
          <PensionFundSelect disabled={!editable} productType={product.productType} value={product} onChange={(fund) => updateProduct(index, { ...fund, ...(context === "employee" ? { institutionalBody: fund.fundCompanyName || product.institutionalBody, manufacturer: fund.fundCompanyName || product.manufacturer } : {}) })} />
          <div className="field"><label>מספר פוליסה / חשבון</label><UiInput disabled={!editable} maxLength={20} value={product.policyNumber} onChange={(e) => updateProduct(index, { policyNumber: e.target.value })} placeholder="אופציונלי" /></div>
          {context === "report" ? <div className="field"><label>חודש שכר *</label><UiInput disabled={!editable} required type="month" value={(product.salaryMonth ?? month ?? "").slice(0, 7)} onChange={(e) => updateProduct(index, { salaryMonth: `${e.target.value}-01` })} /></div> : null}
          <div className="field"><label>שיטת הקצאת שכר *</label><ReferenceOptionSelect category="salary-allocation-type" disabled={!editable} value={allocationType} required onChange={(value) => { const next = Number(value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: next, salaryAllocationValue: next === 4 ? null : product.salaryAllocationValue ?? product.salary ?? 0 }); }} /></div>
          {allocationType !== 4 ? <div className="field"><label>{allocationValueLabel(allocationType)} *</label><UiInput disabled={!editable} type="number" min="0" max={allocationType === 2 ? 100 : undefined} step="0.01" value={product.salaryAllocationValue ?? ""} onChange={(e) => updateProduct(index, { salaryAllocationValue: Number(e.target.value) })} /></div> : <div className="field"><label>ערך הקצאה</label><UiInput disabled value="מחושב אוטומטית" /></div>}
          <div className="field"><label>סדר חישוב *</label><UiInput disabled={!editable} type="number" min="0" step="1" value={product.allocationOrder ?? index} onChange={(e) => updateProduct(index, { allocationOrder: Number(e.target.value) })} /></div>
          <div className="field"><label>שכר מבוטח מחושב</label><UiInput disabled value={`₪${insuredSalary.toLocaleString("he-IL")}`} /></div>
          {context === "employee" ? <><div className="field"><label>גוף מוסדי</label><UiInput disabled={!editable} maxLength={160} value={product.institutionalBody ?? ""} onChange={(e) => updateProduct(index, { institutionalBody: e.target.value })} /></div><div className="field"><label>יצרן</label><UiInput disabled={!editable} maxLength={160} value={product.manufacturer ?? ""} onChange={(e) => updateProduct(index, { manufacturer: e.target.value })} /></div><div className="field"><label>תחילת תוקף *</label><UiDateInput disabled={!editable} value={product.effectiveFrom ?? ""} onValueChange={(value) => updateProduct(index, { effectiveFrom: value })} /></div><div className="field"><label>סיום תוקף</label><UiDateInput disabled={!editable} min={product.effectiveFrom || undefined} value={product.effectiveTo ?? ""} onValueChange={(value) => updateProduct(index, { effectiveTo: value || null })} /></div></> : null}
          <div className="field"><label>{context === "employee" ? "סוג תקבול ברירת מחדל *" : "סוג תקבול *"}</label><EmployerInterfaceOptionSelect category="receipt-type" value={Number(product.reportingType) || null} disabled={!editable} required onChange={(value) => updateProduct(index, { reportingType: value == null ? "" : String(value) })} /></div>
          <div className="field"><label>רובד שכר *</label><SalaryLayerSelect disabled={!editable} value={product.salaryLayer} onChange={(value) => updateProduct(index, { salaryLayer: value })} /></div>
          <div className="field"><label>סעיף 14 *</label><EmployerInterfaceOptionSelect category="section14-code" value={section14Code} disabled={!editable} required onChange={(value) => { const code = Number(value ?? 3) as Section14Code; updateProduct(index, { section14Code: code, section14: code === 1 || code === 2, section14StartDate: code === 2 || code === 4 ? product.section14StartDate : null }); }} /></div>
          <div className="field"><label>תאריך תחולה/ביטול סעיף 14{section14DateRequired ? " *" : ""}</label><UiDateInput disabled={!editable || !section14DateRequired} required={section14DateRequired} value={section14DateRequired ? product.section14StartDate ?? "" : ""} onValueChange={(value) => updateProduct(index, { section14StartDate: value || null })} /></div>
        </div>
        <div className="contribution-grid"><ContributionEditor context={context} title="הפקדות מעסיק" party="employer" product={product} items={product.employerContributions} editable={editable} onChange={(component, key, value) => updateContribution(index, "employerContributions", component, key, value)} /><ContributionEditor context={context} title="הפקדות עובד" party="employee" product={product} items={product.employeeContributions} editable={editable} onChange={(component, key, value) => updateContribution(index, "employeeContributions", component, key, value)} /></div>
      </section>;
    })}</div>
    {editable ? <button className="btn btn-soft wide" onClick={() => onProductsChange([...products, createEmptyPensionEditorProduct(context, products.length, month)])}><Plus size={15} />הוספת מוצר</button> : null}
  </>;
}

function ContributionEditor({ context, title, party, product, items, editable, onChange }: { context: "employee" | "report"; title: string; party: "employer" | "employee"; product: PensionEditorProduct; items: PensionEditorContribution[]; editable: boolean; onChange: (component: ContributionComponent, key: "amount" | "percentage" | "exemptPayments", value: number) => void }) {
  const labels = party === "employee" ? employeeComponents : employerComponents;
  return <div className="contribution-section"><h3>{title}</h3><div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>רכיב</th><th>סכום</th><th>אחוז</th><th>תשלומים פטורים</th></tr></thead><tbody>{labels.map(({ value, label }) => { const item = items.find((entry) => entry.component === value) ?? { component: value, percentage: 0, amount: 0, exemptPayments: 0 }; const max = maxPercentage(product.productType, party, value); return <tr key={value}><th>{label}</th><td><UiInput disabled={!editable} type="number" min="0" step="0.01" value={item.amount || ""} onChange={(e) => onChange(value, "amount", Number(e.target.value))} /></td><td><UiInput disabled={!editable} type="number" min="0" max={max} step="0.0001" value={item.percentage || ""} onChange={(e) => onChange(value, "percentage", Number(e.target.value))} /></td><td><UiInput disabled={!editable} type="number" min="0" step="0.01" value={item.exemptPayments || ""} onChange={(e) => onChange(value, "exemptPayments", Number(e.target.value))} /></td></tr>; })}</tbody></table></div></div>;
}
