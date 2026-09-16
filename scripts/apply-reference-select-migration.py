from pathlib import Path
import re


def edit(path, fn):
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    n = fn(s)
    p.write_text(n, encoding="utf-8")


def rep(s, old, new, label):
    if old not in s:
        raise SystemExit(f"missing replacement [{label}]")
    return s.replace(old, new)


def manual_report(s):
    s = rep(s,
        'import { PensionFundSelect } from "@/components/pension-fund-select";\n',
        'import { PensionFundSelect } from "@/components/pension-fund-select";\nimport { ReferenceOptionSelect } from "@/components/reference-option-select";\n', 'manual import')
    s = re.sub(r'const productTypes: \{ value: PensionProductType; label: string \}\[\] = \[.*?\];\n\nconst allocationTypes: \{ value: SalaryAllocationType; label: string \}\[\] = \[.*?\];\n\n', '', s, flags=re.S)
    s = rep(s,
        '<div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{productTypes.find((item) => item.value === product.productType)?.label ?? "מוצר פנסיוני"}</b></div><button className="icon-button danger" onClick={remove}><Trash2 size={16} /></button></div>',
        '<div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{rawProduct.fundName || "מוצר פנסיוני"}</b></div><button className="icon-button danger" onClick={remove}><Trash2 size={16} /></button></div>', 'manual title')
    s = rep(s,
        '<div className="field"><label>סוג מוצר *</label><select value={rawProduct.productType} onChange={(event) => updateProduct(index, { productType: Number(event.target.value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>',
        '<div className="field"><label>סוג מוצר *</label><ReferenceOptionSelect category="pension-product-type" value={rawProduct.productType} required onChange={(value) => updateProduct(index, { productType: Number(value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" })} /></div>', 'manual product type')
    s = rep(s,
        '<div className="field"><label>שיטת הקצאת שכר *</label><select value={allocationType} onChange={(event) => { const type = Number(event.target.value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: type, salaryAllocationValue: type === 4 ? null : rawProduct.salaryAllocationValue ?? rawProduct.salary ?? 0 }); }}>{allocationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>',
        '<div className="field"><label>שיטת הקצאת שכר *</label><ReferenceOptionSelect category="salary-allocation-type" value={allocationType} required onChange={(value) => { const type = Number(value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: type, salaryAllocationValue: type === 4 ? null : rawProduct.salaryAllocationValue ?? rawProduct.salary ?? 0 }); }} /></div>', 'manual allocation')
    return s


def mix(s):
    s = rep(s,
        'import { PensionFundSelect } from "@/components/pension-fund-select";\n',
        'import { PensionFundSelect } from "@/components/pension-fund-select";\nimport { ReferenceOptionSelect } from "@/components/reference-option-select";\n', 'mix import')
    s = re.sub(r'const productTypes: \{ value: PensionProductType; label: string \}\[\] = \[.*?\];\nconst allocationTypes: \{ value: SalaryAllocationType; label: string \}\[\] = \[.*?\];\n', '', s, flags=re.S)
    s = rep(s,
        '<div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{productTypes.find((x) => x.value === product.productType)?.label}</b></div>',
        '<div className="report-product-title"><div><span>מוצר {index + 1}</span><b>{product.fundName || "מוצר פנסיוני"}</b></div>', 'mix title')
    s = rep(s,
        '<div className="field"><label>סטטוס מוצר</label><select disabled={!editable} value={product.isActive ? "active" : "inactive"} onChange={(e) => updateProduct(index, { isActive: e.target.value === "active" })}><option value="active">פעיל</option><option value="inactive">לא פעיל</option></select></div>',
        '<div className="field"><label>סטטוס מוצר</label><ReferenceOptionSelect category="product-active-status" disabled={!editable} value={product.isActive ? "active" : "inactive"} onChange={(value) => updateProduct(index, { isActive: value === "active" })} /></div>', 'mix active status')
    s = rep(s,
        '<div className="field"><label>סוג מוצר *</label><select disabled={!editable} value={product.productType} onChange={(e) => updateProduct(index, { productType: Number(e.target.value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" })}>{productTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>',
        '<div className="field"><label>סוג מוצר *</label><ReferenceOptionSelect category="pension-product-type" disabled={!editable} value={product.productType} required onChange={(value) => updateProduct(index, { productType: Number(value) as PensionProductType, fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" })} /></div>', 'mix product type')
    s = rep(s,
        '<div className="field"><label>שיטת הקצאת שכר *</label><select disabled={!editable} value={allocationType} onChange={(e) => { const next = Number(e.target.value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: next, salaryAllocationValue: next === 4 ? null : product.salaryAllocationValue ?? 0 }); }}>{allocationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>',
        '<div className="field"><label>שיטת הקצאת שכר *</label><ReferenceOptionSelect category="salary-allocation-type" disabled={!editable} value={allocationType} required onChange={(value) => { const next = Number(value) as SalaryAllocationType; updateProduct(index, { salaryAllocationType: next, salaryAllocationValue: next === 4 ? null : product.salaryAllocationValue ?? 0 }); }} /></div>', 'mix allocation')
    return s


def deposits(s):
    s = rep(s,
        'import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";\n',
        'import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";\nimport { ReferenceOptionSelect } from "@/components/reference-option-select";\n', 'deposit import')
    s = rep(s,
        '<div className="field payment-method"><label>אופן התשלום *</label><select required value={form.paymentMethod} onChange={(e) => patch("paymentMethod", e.target.value)}><option>העברה בנקאית</option><option>מס״ב</option><option>המחאה</option><option>אחר</option></select></div>',
        '<div className="field payment-method"><label>אופן התשלום *</label><ReferenceOptionSelect category="manual-payment-method" required value={form.paymentMethod} onChange={(value) => patch("paymentMethod", value)} /></div>', 'deposit payment method')
    return s


def access(s):
    s = rep(s,
        'import { VirtualizedTable } from "@/components/virtualized-table";\n',
        'import { VirtualizedTable } from "@/components/virtualized-table";\nimport { ReferenceOptionSelect } from "@/components/reference-option-select";\n', 'access import component')
    s = rep(s,
        'import { getOrganizationSelection } from "@/lib/session";\n',
        'import { getOrganizationSelection } from "@/lib/session";\nimport { referenceOptionsApi, type ReferenceOption } from "@/lib/reference-options-api";\n', 'access import api')
    s = rep(s, 'const roleNames: Record<OrganizationRole, string> = { 1: "מנהל ארגון", 2: "מנהל שכר", 3: "נציג תפעול", 4: "צפייה בלבד" };\n\n', '', 'access role names')
    s = rep(s,
        '  const [newAccessMode, setNewAccessMode] = useState<EmployerAccessMode>(2);\n',
        '  const [newAccessMode, setNewAccessMode] = useState<EmployerAccessMode>(2);\n  const [roleOptions, setRoleOptions] = useState<ReferenceOption[]>([]);\n  const [accessModeOptions, setAccessModeOptions] = useState<ReferenceOption[]>([]);\n', 'access states')
    marker = '  useEffect(() => { setSkip(0); }, [search]);\n'
    addition = marker + '\n  useEffect(() => {\n    Promise.all([referenceOptionsApi.list("organization-role"), referenceOptionsApi.list("employer-access-mode")])\n      .then(([roles, modes]) => { setRoleOptions(roles); setAccessModeOptions(modes); })\n      .catch((err) => setError(err instanceof Error ? err.message : "טעינת ערכי ההרשאות נכשלה"));\n  }, []);\n'
    s = rep(s, marker, addition, 'access options effect')
    replacements = [
        ('<select value={newRole} onChange={(e) => setNewRole(Number(e.target.value) as OrganizationRole)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>', '<ReferenceOptionSelect category="organization-role" value={newRole} onChange={(value) => setNewRole(Number(value) as OrganizationRole)} />'),
        ('<select value={newAccessMode} onChange={(e) => setNewAccessMode(Number(e.target.value) as EmployerAccessMode)}><option value={1}>כל המעסיקים בארגון</option><option value={2}>מעסיקים מסוימים בלבד</option></select>', '<ReferenceOptionSelect category="employer-access-mode" value={newAccessMode} onChange={(value) => setNewAccessMode(Number(value) as EmployerAccessMode)} />'),
        ('<select value={role} onChange={(e) => setRole(Number(e.target.value) as OrganizationRole)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>', '<ReferenceOptionSelect category="organization-role" value={role} onChange={(value) => setRole(Number(value) as OrganizationRole)} />'),
        ('<select value={accessMode} onChange={(e) => setAccessMode(Number(e.target.value) as EmployerAccessMode)}><option value={1}>כל המעסיקים בארגון</option><option value={2}>מעסיקים מסוימים בלבד</option></select>', '<ReferenceOptionSelect category="employer-access-mode" value={accessMode} onChange={(value) => setAccessMode(Number(value) as EmployerAccessMode)} />'),
    ]
    for old, new in replacements:
        s = rep(s, old, new, 'access select')
    s = s.replace('roleNames[item.role]', 'roleOptions.find((option) => Number(option.value) === item.role)?.label ?? String(item.role)')
    s = s.replace('item.employerAccessMode === 1 ? "כל המעסיקים" : "מעסיקים מסוימים"', 'accessModeOptions.find((option) => Number(option.value) === item.employerAccessMode)?.label ?? String(item.employerAccessMode)')
    return s


edit('src/components/manual-report-data.tsx', manual_report)
edit('src/components/employee-pension-mix.tsx', mix)
edit('src/components/manual-deposit-data.tsx', deposits)
edit('src/app/access/page.tsx', access)
