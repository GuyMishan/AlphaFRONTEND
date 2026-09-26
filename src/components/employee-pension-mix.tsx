"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { PensionProductsEditor, normalizePensionEditorProducts, validatePensionEditorProducts, type PensionEditorProduct } from "@/components/pension-products-editor";
import { alphaApi } from "@/lib/api";
import type { Employee, EmployeePensionProductInput, PensionProductType, SalaryAllocationType, Section14Code } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

function toEditorProduct(item: EmployeePensionProductInput): PensionEditorProduct {
  return {
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
  editable: boolean;
  saveLabel?: string;
  onSaved?: () => void | Promise<void>;
};

export function EmployeePensionMix({ organizationId, employerId, employeeId, editable, saveLabel, onSaved }: EmployeePensionMixProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [products, setProducts] = useState<PensionEditorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      alphaApi.employee(organizationId, employerId, employeeId),
      alphaApi.employeePensionMix(organizationId, employerId, employeeId),
    ]).then(([employeeResult, items]) => {
      setEmployee(employeeResult);
      setMonthlySalary(Number(employeeResult.monthlySalary ?? 0));
      setProducts(items.map(toEditorProduct));
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת תמהיל העובד נכשלה"))
      .finally(() => setLoading(false));
  }, [organizationId, employerId, employeeId]);

  const activeCount = useMemo(() => products.filter((product) => product.isActive !== false).length, [products]);

  async function save() {
    if (!editable || !employee) return;
    setValidationAttempted(true);
    const normalized = normalizePensionEditorProducts(monthlySalary, products);
    const validationError = normalized.error || validatePensionEditorProducts(normalized.products, "employee");
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await alphaApi.updateEmployee(organizationId, employerId, employeeId, {
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
      await alphaApi.saveEmployeePensionMix(organizationId, employerId, employeeId, normalized.products.map(toEmployeeProduct));
      setEmployee({ ...employee, monthlySalary });
      setProducts(normalized.products);
      setSaved(true);
      if (onSaved) await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת תמהיל העובד נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card empty">טוען את תמהיל העובד...</div>;

  return <div className="card">
    <div className="card-head">
      <div><h2>תמהיל העובד</h2><span style={{ color: "var(--muted)" }}>המוצרים נשמרים כברירת המחדל של העובד ומשמשים ליצירת דיווחים חדשים.</span></div>
      {editable ? <button className="btn btn-primary" disabled={saving} onClick={() => void save()}><Save size={17} />{saving ? "שומר..." : saveLabel ?? "שמירת תמהיל"}</button> : null}
    </div>
    <div className="manual-report-badges" style={{ marginBottom: 14 }}><span className="badge badge-blue">{products.length} מוצרים</span><span className="badge badge-green">{activeCount} פעילים</span></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{error}</div> : null}
    {saved ? <div className="notice notice-success" style={{ marginBottom: 14 }}>תמהיל העובד נשמר בהצלחה.</div> : null}
    {!editable ? <div className="notice notice-info" style={{ marginBottom: 14 }}>יש לך הרשאת צפייה בלבד בתמהיל העובד.</div> : null}
    <PensionProductsEditor
      context="employee"
      monthlySalary={monthlySalary}
      products={products}
      editable={editable}
      showAllocationError={validationAttempted}
      onMonthlySalaryChange={(value) => { setMonthlySalary(value); setSaved(false); setError(""); setValidationAttempted(false); }}
      onProductsChange={(value) => { setProducts(value); setSaved(false); setError(""); setValidationAttempted(false); }}
    />
  </div>;
}
