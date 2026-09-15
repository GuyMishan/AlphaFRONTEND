"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Plus, Save, Trash2 } from "lucide-react";
import { alphaApi } from "@/lib/api";
import type { ContributionComponent, EmployeePensionProductInput, PensionProductType } from "@/lib/types";

const productTypes: { value: PensionProductType; label: string }[] = [
  { value: 1, label: "קרן פנסיה" },
  { value: 2, label: "קרן השתלמות" },
  { value: 3, label: "ביטוח מנהלים" },
  { value: 4, label: "קופת גמל" },
  { value: 99, label: "אחר" },
];

const components: { value: ContributionComponent; label: string }[] = [
  { value: 1, label: "פיצויים" },
  { value: 2, label: "תגמולים" },
  { value: 3, label: "אכ״ע" },
  { value: 4, label: "שונות" },
];

const today = () => new Date().toISOString().slice(0, 10);

function emptyProduct(): EmployeePensionProductInput {
  return {
    productType: 1,
    policyNumber: "",
    salary: 0,
    reportingType: "שוטף",
    salaryLayer: "רובד 1",
    section14: false,
    section14StartDate: null,
    isActive: true,
    effectiveFrom: today(),
    effectiveTo: null,
    institutionalBody: "",
    manufacturer: "",
    employerContributions: components.map(({ value }) => ({ component: value, percentage: 0 })),
    employeeContributions: components.map(({ value }) => ({ component: value, percentage: 0 })),
  };
}

function normalizeContributions(items: Array<{ component: ContributionComponent; percentage: number }>) {
  return components.map(({ value }) => {
    const found = items.find((item) => Number(item.component) === value);
    return { component: value, percentage: found ? Number(found.percentage) : 0 };
  });
}

const missingLabels: Record<string, string> = {
  policyNumber: "מספר פוליסה",
  salary: "שכר",
  institutionalBody: "גוף מוסדי",
  manufacturer: "יצרן",
  section14StartDate: "תחילת סעיף 14",
  contributions: "אחוזי הפקדה",
};

function productMissingDetails(product: EmployeePensionProductInput) {
  const missing: string[] = [];
  if (!product.policyNumber.trim()) missing.push("policyNumber");
  if (Number(product.salary) <= 0) missing.push("salary");
  if (!product.institutionalBody.trim()) missing.push("institutionalBody");
  if (!product.manufacturer.trim()) missing.push("manufacturer");
  if (product.section14 && !product.section14StartDate) missing.push("section14StartDate");
  if (![...product.employerContributions, ...product.employeeContributions].some((item) => Number(item.percentage) > 0)) missing.push("contributions");
  return missing;
}

export function EmployeePensionMix({ organizationId, employerId, employeeId, editable }: { organizationId: string; employerId: string; employeeId: string; editable: boolean }) {
  const [products, setProducts] = useState<EmployeePensionProductInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true); setError("");
    alphaApi.employeePensionMix(organizationId, employerId, employeeId)
      .then((items) => setProducts(items.map((item) => ({
        productType: Number(item.productType) as PensionProductType,
        policyNumber: item.policyNumber,
        salary: Number(item.salary),
        reportingType: item.reportingType,
        salaryLayer: item.salaryLayer,
        section14: item.section14,
        section14StartDate: item.section14StartDate,
        isActive: item.isActive ?? true,
        effectiveFrom: item.effectiveFrom || today(),
        effectiveTo: item.effectiveTo ?? null,
        institutionalBody: item.institutionalBody ?? "",
        manufacturer: item.manufacturer ?? "",
        employerContributions: normalizeContributions(item.employerContributions),
        employeeContributions: normalizeContributions(item.employeeContributions),
      }))))
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת תמהיל העובד נכשלה"))
      .finally(() => setLoading(false));
  }, [organizationId, employerId, employeeId]);

  const completeCount = useMemo(() => products.filter((product) => productMissingDetails(product).length === 0).length, [products]);
  const activeCount = useMemo(() => products.filter((product) => product.isActive).length, [products]);

  function updateProduct(index: number, patch: Partial<EmployeePensionProductInput>) {
    setProducts((current) => current.map((product, i) => i === index ? { ...product, ...patch } : product));
    setSaved(false); setError("");
  }

  function updatePercentage(index: number, party: "employerContributions" | "employeeContributions", component: ContributionComponent, percentage: number) {
    setProducts((current) => current.map((product, i) => i !== index ? product : {
      ...product,
      [party]: product[party].map((item) => item.component === component ? { ...item, percentage: Number.isFinite(percentage) ? percentage : 0 } : item),
    }));
    setSaved(false); setError("");
  }

  async function save() {
    if (!editable) return;
    if (products.some((product) => product.isActive && !product.policyNumber.trim())) { setError("למוצר פעיל חייב להיות מספר פוליסה."); return; }
    if (products.some((product) => product.salary < 0)) { setError("שכר לא יכול להיות שלילי."); return; }
    if (products.some((product) => !product.effectiveFrom)) { setError("יש להזין תאריך תחילת תוקף לכל מוצר."); return; }
    if (products.some((product) => product.effectiveTo && product.effectiveTo < product.effectiveFrom)) { setError("תאריך סיום מוצר לא יכול להיות מוקדם מתאריך תחילת התוקף."); return; }
    setSaving(true); setError(""); setSaved(false);
    try {
      await alphaApi.saveEmployeePensionMix(organizationId, employerId, employeeId, products);
      setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "שמירת תמהיל העובד נכשלה"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="card empty">טוען את תמהיל העובד...</div>;

  return <div className="card">
    <div className="card-head">
      <div>
        <h2>תמהיל העובד</h2>
        <span style={{ color: "var(--muted)" }}>רק מוצרים פעילים ובתוקף לחודש הדיווח ייכנסו אוטומטית לדיווחים חדשים.</span>
      </div>
      {editable ? <button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? "שומר..." : "שמירת תמהיל"}</button> : null}
    </div>

    <div className="manual-report-badges" style={{ marginBottom: 16 }}>
      <span className="badge badge-blue">{products.length} מוצרים</span>
      <span className="badge badge-green">{activeCount} פעילים</span>
      <span className={completeCount === products.length ? "badge badge-green" : "badge badge-orange"}>{completeCount}/{products.length} מלאים</span>
    </div>

    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}
    {saved ? <div className="notice notice-success" style={{ marginBottom: 16 }}>תמהיל העובד נשמר בהצלחה.</div> : null}
    {!editable ? <div className="notice notice-info" style={{ marginBottom: 16 }}>יש לך הרשאת צפייה בלבד בתמהיל העובד.</div> : null}

    <div className="product-editor-list">
      {products.map((product, index) => {
        const missing = productMissingDetails(product);
        return <section className="report-product-card" key={index} style={{ opacity: product.isActive ? 1 : 0.72 }}>
          <div className="report-product-title">
            <div>
              <span>מוצר {index + 1}</span>
              <b>{productTypes.find((x) => x.value === product.productType)?.label}</b>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={product.isActive ? "badge badge-green" : "badge badge-gray"}>{product.isActive ? "פעיל" : "לא פעיל"}</span>
              {missing.length === 0 ? <span className="badge badge-green"><CircleCheck size={13} />תקין</span> : <span className="badge badge-orange" title={missing.map((item) => missingLabels[item] ?? item).join(", ")}><CircleAlert size={13} />חסר מידע</span>}
              {editable ? <button className="icon-button danger" onClick={() => setProducts((current) => current.filter((_, i) => i !== index))} aria-label="מחיקת מוצר"><Trash2 size={16} /></button> : null}
            </div>
          </div>

          {missing.length > 0 ? <div className="notice notice-info" style={{ marginBottom: 14 }}>חסר להשלמה: {missing.map((item) => missingLabels[item] ?? item).join(", ")}.</div> : null}

          <div className="grid report-product-fields">
            <div className="field"><label>סטטוס מוצר</label><select disabled={!editable} value={product.isActive ? "active" : "inactive"} onChange={(e) => updateProduct(index, { isActive: e.target.value === "active" })}><option value="active">פעיל</option><option value="inactive">לא פעיל</option></select></div>
            <div className="field"><label>סוג מוצר *</label><select disabled={!editable} value={product.productType} onChange={(e) => updateProduct(index, { productType: Number(e.target.value) as PensionProductType })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
            <div className="field"><label>מספר פוליסה *</label><input disabled={!editable} maxLength={100} value={product.policyNumber} onChange={(e) => updateProduct(index, { policyNumber: e.target.value })} /></div>
            <div className="field"><label>גוף מוסדי</label><input disabled={!editable} maxLength={160} value={product.institutionalBody} onChange={(e) => updateProduct(index, { institutionalBody: e.target.value })} placeholder="לדוגמה: מגדל / הראל / מנורה" /></div>
            <div className="field"><label>יצרן</label><input disabled={!editable} maxLength={160} value={product.manufacturer} onChange={(e) => updateProduct(index, { manufacturer: e.target.value })} /></div>
            <div className="field"><label>תחילת תוקף *</label><input disabled={!editable} type="date" value={product.effectiveFrom} onChange={(e) => updateProduct(index, { effectiveFrom: e.target.value })} /></div>
            <div className="field"><label>סיום תוקף</label><input disabled={!editable} type="date" min={product.effectiveFrom || undefined} value={product.effectiveTo ?? ""} onChange={(e) => updateProduct(index, { effectiveTo: e.target.value || null })} /></div>
            <div className="field"><label>שכר ברירת מחדל *</label><input disabled={!editable} type="number" min="0" step="0.01" value={product.salary || ""} onChange={(e) => updateProduct(index, { salary: Number(e.target.value) })} /></div>
            <div className="field"><label>סוג דיווח ברירת מחדל</label><select disabled={!editable} value={product.reportingType} onChange={(e) => updateProduct(index, { reportingType: e.target.value })}><option>שוטף</option><option>הפרשים</option><option>תיקון</option><option>שלילי</option></select></div>
            <div className="field"><label>רובד שכר</label><select disabled={!editable} value={product.salaryLayer} onChange={(e) => updateProduct(index, { salaryLayer: e.target.value })}><option>רובד 1</option><option>רובד 2</option><option>רובד נוסף</option></select></div>
            <label className="section14-check"><input disabled={!editable} type="checkbox" checked={product.section14} onChange={(e) => updateProduct(index, { section14: e.target.checked, section14StartDate: e.target.checked ? product.section14StartDate : null })} /><span>סעיף 14</span></label>
            <div className="field"><label>תחילת סעיף 14</label><input disabled={!editable || !product.section14} type="date" value={product.section14StartDate ?? ""} onChange={(e) => updateProduct(index, { section14StartDate: e.target.value || null })} /></div>
          </div>
          <div className="contribution-grid">
            <MixContributionTable title="הפקדות מעסיק" items={product.employerContributions} editable={editable} onChange={(component, value) => updatePercentage(index, "employerContributions", component, value)} />
            <MixContributionTable title="הפקדות עובד" items={product.employeeContributions} editable={editable} onChange={(component, value) => updatePercentage(index, "employeeContributions", component, value)} />
          </div>
        </section>;
      })}
      {!products.length ? <div className="empty"><b>עדיין לא הוגדר תמהיל לעובד</b><span>הוסיפו מוצרים, תקופת תוקף ואחוזי הפקדה כדי שהם ייכנסו אוטומטית לדיווחים חדשים.</span></div> : null}
    </div>
    {editable ? <button className="btn btn-soft wide" onClick={() => setProducts((current) => [...current, emptyProduct()])}><Plus size={16} />הוספת מוצר לתמהיל</button> : null}
  </div>;
}

function MixContributionTable({ title, items, editable, onChange }: { title: string; items: Array<{ component: ContributionComponent; percentage: number }>; editable: boolean; onChange: (component: ContributionComponent, percentage: number) => void }) {
  return <div className="contribution-table"><div className="contribution-table-title">{title}</div><div className="contribution-table-head"><span>רכיב</span><span>אחוז</span></div>{components.map(({ value, label }) => { const item = items.find((x) => Number(x.component) === value) ?? { component: value, percentage: 0 }; return <div className="contribution-row" key={value}><b>{label}</b><input disabled={!editable} type="number" min="0" max="100" step="0.01" value={item.percentage || ""} onChange={(e) => onChange(value, Number(e.target.value))} /></div>; })}</div>;
}
