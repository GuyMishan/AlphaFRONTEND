"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { EmployerDocumentsTab } from "@/features/employers/components/employer-documents-tab";
import { employerDocumentsApi, type EmployerDocument } from "@/features/employers/documents-api";
import { UiSelect } from "@/components/ui/ui-controls";
import { toast } from "sonner";
import { PensionProductsEditor, normalizePensionEditorProducts, sanitizePensionProductContributions, validatePensionEditorProducts, type PensionEditorProduct } from "@/features/pension/components/pension-products-editor";
import { employeesApi } from "@/features/employees/api";
import type { Employee } from "@/features/employees/types";
import type { EmployeePensionProductInput, PensionProductType, SalaryAllocationType, Section14Code } from "@/features/pension/types";
import type { PensionEditorContributionLimit } from "@/features/reference-data/types";

const today = () => new Date().toISOString().slice(0, 10);

function toEditorProduct(item: EmployeePensionProductInput & { id?: string }): PensionEditorProduct {
  return {
    employeePensionProductId: item.id,
    productType: Number(item.productType) as PensionProductType,
    policyNumber: item.policyNumber,
    fundExternalKey: item.fundExternalKey ?? "",
    fundCode: item.fundCode ?? "",
    fundName: item.fundName ?? "",
    fundCompanyName: item.fundCompanyName ?? "",
    salary: Number(item.salary || 0),
    salaryAllocationType: Number(item.salaryAllocationType ?? 1) as SalaryAllocationType,
    salaryAllocationValue: Number(item.salaryAllocationType ?? 1) === 4 ? null : Number(item.salaryAllocationValue ?? item.salary ?? 0),
    reportingType: item.reportingType,
    salaryLayer: item.salaryLayer,
    section14: item.section14,
    section14Code: item.section14Code == null ? undefined : Number(item.section14Code) as Section14Code,
    section14StartDate: item.section14StartDate,
    isActive: item.isActive ?? true,
    effectiveFrom: item.effectiveFrom || today(),
    effectiveTo: item.effectiveTo ?? null,
    institutionalBody: item.institutionalBody ?? "",
    manufacturer: item.manufacturer ?? "",
    employerContributions: item.employerContributions.map((entry) => ({ component: entry.component, percentage: Number(entry.percentage || 0), amount: Number(entry.amount ?? 0), exemptPayments: Number(entry.exemptPayments ?? 0) })),
    employeeContributions: item.employeeContributions.map((entry) => ({ component: entry.component, percentage: Number(entry.percentage || 0), amount: Number(entry.amount ?? 0), exemptPayments: Number(entry.exemptPayments ?? 0) })),
  };
}

function toEmployeeProduct(product: PensionEditorProduct): EmployeePensionProductInput {
  return {
    productType: product.productType,
    policyNumber: product.policyNumber,
    fundExternalKey: product.fundExternalKey ?? "",
    fundCode: product.fundCode ?? "",
    fundName: product.fundName ?? "",
    fundCompanyName: product.fundCompanyName ?? "",
    salary: Number(product.salary || 0),
    reportingType: product.reportingType,
    salaryLayer: product.salaryLayer,
    section14: product.section14,
    section14Code: product.section14Code,
    section14StartDate: product.section14StartDate,
    isActive: product.isActive ?? true,
    effectiveFrom: product.effectiveFrom || today(),
    effectiveTo: product.effectiveTo ?? null,
    institutionalBody: product.institutionalBody ?? "",
    manufacturer: product.manufacturer ?? "",
    salaryAllocationType: Number(product.salaryAllocationType ?? 1) as SalaryAllocationType,
    salaryAllocationValue: product.salaryAllocationValue ?? null,
    employerContributions: product.employerContributions.map((entry) => ({ component: entry.component, percentage: Number(entry.percentage || 0), amount: Number(entry.amount ?? 0), exemptPayments: Number(entry.exemptPayments ?? 0) })),
    employeeContributions: product.employeeContributions.map((entry) => ({ component: entry.component, percentage: Number(entry.percentage || 0), amount: Number(entry.amount ?? 0), exemptPayments: Number(entry.exemptPayments ?? 0) })),
  };
}

type EmployeePensionMixProps = {
  organizationId: string;
  employerId: string;
  employeeId: string;
  employee?: Employee;
  editable: boolean;
  saveLabel?: string;
  onSaved?: () => void | Promise<void>;
  externalSaveSignal?: number;
  hideHeaderSave?: boolean;
  onSavingChange?: (saving: boolean) => void;
};

export function EmployeePensionMix({ organizationId, employerId, employeeId, employee: initialEmployee, editable, saveLabel, onSaved, externalSaveSignal = 0, hideHeaderSave = false, onSavingChange }: EmployeePensionMixProps) {
  const [employee, setEmployee] = useState<Employee | null>(initialEmployee ?? null);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [products, setProducts] = useState<PensionEditorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [contributionLimits, setContributionLimits] = useState<PensionEditorContributionLimit[]>([]);
  const [libraryDocuments, setLibraryDocuments] = useState<EmployerDocument[]>([]);
  const [legacyAssignments, setLegacyAssignments] = useState<Record<string, string>>({});
  const [assigningLegacy, setAssigningLegacy] = useState("");

  async function reloadDocuments() {
    setLibraryDocuments(await employerDocumentsApi.list(organizationId, employerId, { employmentId: employeeId }));
  }

  async function assignLegacyDocument(documentId: string) {
    const productId = legacyAssignments[documentId];
    if (!productId) return;
    setAssigningLegacy(documentId);
    try {
      await employerDocumentsApi.assignProduct(organizationId, employerId, documentId, productId);
      await reloadDocuments();
      toast.success("המסמך שויך למוצר הפנסיוני.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "שיוך המסמך נכשל.");
    } finally {
      setAssigningLegacy("");
    }
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      initialEmployee ? Promise.resolve(initialEmployee) : employeesApi.employee(organizationId, employerId, employeeId),
      employeesApi.employeePensionMix(organizationId, employerId, employeeId),
      employerDocumentsApi.list(organizationId, employerId, { employmentId: employeeId }),
    ]).then(([employeeResult, items, documents]) => {
      setEmployee(employeeResult);
      setMonthlySalary(Number(employeeResult.monthlySalary ?? 0));
      setProducts(items.map(toEditorProduct).map(sanitizePensionProductContributions));
      setLibraryDocuments(documents);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת תמהיל העובד נכשלה"))
      .finally(() => setLoading(false));
  }, [organizationId, employerId, employeeId, initialEmployee]);

  const activeCount = useMemo(() => products.filter((product) => product.isActive !== false).length, [products]);
  const legacyDocuments = libraryDocuments.filter(doc => !doc.employeePensionProductId);

  async function save() {
    if (!editable || !employee) return;
    setValidationAttempted(true);
    const normalized = normalizePensionEditorProducts(monthlySalary, products);
    const validationError = normalized.error || validatePensionEditorProducts(normalized.products, "employee", contributionLimits);
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await employeesApi.updateEmployee(organizationId, employerId, employeeId, {
        nationalId: employee.nationalId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        startDate: employee.startDate,
        monthlySalary,
        birthDate: employee.birthDate ?? null,
        gender: employee.gender ?? null,
        email: employee.email ?? "",
        mobile: employee.mobile ?? "",
        city: employee.city ?? "",
        street: employee.street ?? "",
        houseNumber: employee.houseNumber ?? "",
        apartment: employee.apartment ?? "",
        postalCode: employee.postalCode ?? "",
        postOfficeBox: employee.postOfficeBox ?? "",
      });
      await employeesApi.saveEmployeePensionMix(organizationId, employerId, employeeId, normalized.products.map(toEmployeeProduct));
      setEmployee({ ...employee, monthlySalary });
      const refreshed = await employeesApi.employeePensionMix(organizationId, employerId, employeeId);
      setProducts(refreshed.map(toEditorProduct).map(sanitizePensionProductContributions));
      setSaved(true);
      if (onSaved) await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת תמהיל העובד נכשלה");
    } finally {
      setSaving(false);
    }
  }

  // An embedded modal can invoke the same validated save path from its fixed footer.
  useEffect(() => {
    if (externalSaveSignal > 0) void save();
    // The external signal is the event. Other render/state changes must not resubmit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSaveSignal]);

  if (loading) return <div className="card empty">טוען את תמהיל העובד...</div>;

  return <div className="card">
    <div className="card-head">
      <div><h2>תמהיל העובד</h2><span style={{ color: "var(--muted)" }}>המוצרים נשמרים כברירת המחדל של העובד ומשמשים ליצירת דיווחים חדשים.</span></div>
      {editable && !hideHeaderSave ? <button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? "שומר..." : saveLabel ?? "שמירת תמהיל"}</button> : null}
    </div>
    <div className="manual-report-badges" style={{ marginBottom: 14 }}><span className="badge badge-blue">{products.length} מוצרים</span><span className="badge badge-green">{activeCount} פעילים</span></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div> : null}
    {saved ? <div className="notice notice-success" style={{ marginBottom: 14 }}>תמהיל העובד נשמר בהצלחה.</div> : null}
    {!editable ? <div className="notice notice-info" style={{ marginBottom: 14 }}>יש לך הרשאת צפייה בלבד בתמהיל העובד.</div> : null}
    <PensionProductsEditor
      context="employee"
      renderProductExtra={(product) => <section className="profile-form-section" aria-label="מסמכי המוצר">
        {product.employeePensionProductId
          ? <EmployerDocumentsTab organizationId={organizationId} employerId={employerId} employmentId={employeeId}
              employeePensionProductId={product.employeePensionProductId} canEdit={editable} embedded
              productType={product.productType} loadedDocuments={libraryDocuments} onChanged={reloadDocuments} />
          : <div className="notice notice-info">ניתן לצרף מסמכים לאחר שמירת המוצר בתמהיל העובד.</div>}
      </section>}
      monthlySalary={monthlySalary}
      products={products}
      editable={editable}
      showAllocationError={validationAttempted}
      onFieldInteraction={() => { setError(""); setValidationAttempted(false); }}
      onReferenceDataLoaded={(data) => setContributionLimits(data.contributionLimits ?? [])}
      onMonthlySalaryChange={(value) => { setMonthlySalary(value); setSaved(false); setError(""); setValidationAttempted(false); }}
      onProductsChange={(value) => { setProducts(value.map(sanitizePensionProductContributions)); setSaved(false); setError(""); setValidationAttempted(false); }}
    />
    {legacyDocuments.length > 0 ? <section className="profile-form-section" aria-label="שיוך מסמכים ישנים למוצרים">
      <h3>מסמכים שהועלו בעבר ללא שיוך לקרן</h3>
      <p>יש לבחור את הקרן המתאימה לכל מסמך. קבצים אלה נשמרו ואינם נמחקים אוטומטית.</p>
      {legacyDocuments.map(doc => <div key={doc.id} className="field" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span>{doc.originalFileName}</span>
        {editable ? <>
          <UiSelect aria-label={`מוצר פנסיוני עבור ${doc.originalFileName}`}
            value={legacyAssignments[doc.id] ?? ""}
            onChange={event => setLegacyAssignments(current => ({ ...current, [doc.id]: event.target.value }))}>
            <option value="">בחירת מוצר</option>
            {products.filter(product => product.employeePensionProductId &&
              (doc.documentTypeCode !== 5 || product.productType === 1)).map(product =>
              <option key={product.employeePensionProductId} value={product.employeePensionProductId}>
                {product.fundName || product.policyNumber || "מוצר פנסיוני"}
              </option>)}
          </UiSelect>
          <button type="button" className="btn btn-secondary"
            disabled={!legacyAssignments[doc.id] || assigningLegacy === doc.id}
            onClick={() => void assignLegacyDocument(doc.id)}>שיוך מסמך</button>
        </> : null}
      </div>)}
    </section> : null}
  </div>;
}
