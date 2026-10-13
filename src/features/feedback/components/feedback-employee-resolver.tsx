"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { EmployeeForm } from "@/features/employees/components/employee-form";
import { employeesApi } from "@/features/employees/api";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/features/feedback/api";
import type { Employee } from "@/features/employees/types";

// Match employee comparison fields to the official error being resolved.
const errorFields: Record<number, readonly string[]> = {
  4: ["identifier", "identifierType"],
  11: ["identifier"],
  19: ["employmentStartDate"],
  33: ["employmentStartDate"],
  34: ["employmentStartDate"],
  44: ["employmentStartDate"],
  62: ["identifier", "identifierType"],
  78: ["identifier", "identifierType"],
  86: ["identifier", "identifierType"],
};

const fields = [
  ["identifierType", "סוג מזהה"],
  ["identifier", "מספר מזהה"],
  ["employeeNumber", "מספר עובד"],
  ["birthDate", "תאריך לידה"],
  ["gender", "מין"],
  ["email", "דוא״ל"],
  ["mobile", "נייד"],
  ["employmentStartDate", "תחילת עבודה"],
  ["monthlySalary", "שכר חודשי"],
  ["city", "יישוב"],
  ["street", "רחוב"],
  ["houseNumber", "מספר בית"],
  ["apartment", "דירה"],
  ["postalCode", "מיקוד"],
  ["postOfficeBox", "תא דואר"],
] as const;

function displayValue(key: string, value: string | null | undefined) {
  if (value == null || value === "") return "—";
  if (key === "identifierType") return value === "2" ? "דרכון" : value === "1" ? "תעודת זהות" : value;
  if (key === "gender") return value === "1" ? "זכר" : value === "2" ? "נקבה" : value;
  if (key === "monthlySalary") {
    const number = Number(value);
    if (Number.isFinite(number)) return number.toLocaleString("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });
  }
  return value;
}

export function FeedbackEmployeeResolver({
  organizationId,
  employerId,
  group,
  canEdit,
  onChanged,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const problem = group.problems[0];
  const employmentId = problem?.employmentId;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(Boolean(employmentId));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);

  useEffect(() => {
    if (!employmentId) {
      setEmployee(null);
      setLoading(false);
      setError("לא נמצא עובד פעיל שניתן לערוך עבור קבוצת הטיפול.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setSaved(false);
    employeesApi.employee(organizationId, employerId, employmentId)
      .then(result => {
        if (!cancelled) setEmployee(result);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת העובד נכשלה.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [organizationId, employerId, employmentId]);

  const comparison = useMemo(() => {
    if (!problem) return [];
    const allowed = new Set(errorFields[problem.code] ?? []);
    const candidates = allowed.size
      ? fields.filter(([key]) => allowed.has(key))
      : fields.filter(([key, label]) => {
        const normalizedDescription = problem.description.replace(/["״׳'\-]/g, "").toLowerCase();
        const normalizedLabel = label.replace(/["״׳'\-]/g, "").toLowerCase();
        return normalizedDescription.includes(normalizedLabel);
      });
    const selected = candidates.filter(([key]) =>
      problem.reportedValues[key] != null || problem.currentValues[key] != null);
    // Unknown fields must not expose an unrelated full employee profile.
    return selected.map(([key, label]) => ({
      key,
      label,
      reported: displayValue(key, problem.reportedValues[key]),
      current: displayValue(key, problem.currentValues[key]),
    }));
  }, [problem]);

  if (!problem) return null;

  return <section className="feedback-employee-resolver" aria-label="פתרון פרטי עובד">
    <div className="feedback-resolution-section-head">
      <div>
        <h3>השוואת הנתון שדורש תיקון</h3>
        <p>הנתון בכרטיס העובד מול הערך שנשלח בדיווח. הדיווח המקורי נשמר ללא שינוי.</p>
      </div>
    </div>

    {comparison.length > 0 ? <div className="feedback-resolution-compare" role="table" aria-label="השוואת פרטי עובד">
      <div className="feedback-resolution-compare-head" role="row">
        <b role="columnheader">שדה</b>
        <b role="columnheader">בדיווח שנשלח</b>
        <b role="columnheader">בכרטיס העובד</b>
      </div>
      {comparison.map(row => <div className="feedback-resolution-compare-row" role="row" key={row.key}>
        <span role="cell">{row.label}</span>
        <span role="cell" dir="auto">{row.reported}</span>
        <span role="cell" dir="auto">{row.current}</span>
      </div>)}
    </div> : <div className="notice notice-info">לא נמצאו שני ערכים זמינים להשוואה עבור השדה של השגיאה. אפשר לבדוק את הפרטים בכרטיס העובד.</div>}

    {!canEdit ? <div className="notice notice-error">
      <AlertTriangle size={16} aria-hidden="true" />אין לך הרשאת עריכת עובד. ניתן לצפות בהשוואה אך לא לשנות נתונים.
    </div> : null}

    {saved ? <div className="notice notice-info">
      <CheckCircle2 size={16} aria-hidden="true" />
      פרטי העובד עודכנו והוכנו בגרסת התיקון. השגיאה תישאר דורשת טיפול עד להשלמת הדיווח החוזר; שגיאות Decision נשארות לטיפול נפרד.
    </div> : null}

    {loading ? <div className="empty">טוען את פרטי העובד...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {!loading && !error && employee && canEdit ? <button
      type="button"
      className="btn btn-secondary"
      aria-expanded={showEmployeeForm}
      onClick={() => setShowEmployeeForm(value => !value)}
    >{showEmployeeForm ? "סגירת עריכת כרטיס העובד" : "תיקון בכרטיס העובד"}</button> : null}

    {!loading && !error && employee && showEmployeeForm ? <div className="feedback-resolution-employee-form">
      <EmployeeForm
        key={`${employee.id}:${formVersion}`}
        organizationId={organizationId}
        employerId={employerId}
        employee={employee}
        editable={canEdit}
        embedded
        submitLabel="שמירת פרטי העובד"
        beforeSave={async () => {
          if (!problem.reportId || !problem.reportProductId || !employmentId)
            throw new Error("הקשר הפתרון אינו מלא. רעננו את המשוב ונסו שוב.");
          await reportFeedbackApi.validateEmployeeResolutionAction(
            organizationId,
            employerId,
            problem.reportId,
            problem.reportProductId,
            group.groupKey,
            employmentId,
          );
        }}
        onSaved={async savedEmployee => {
          setEmployee(savedEmployee);
          const editableProblems = group.problems
            .filter(item => item.resolutionType === "edit")
            .map(item => item.problemId);
          try {
            if (editableProblems.length) {
              await reportFeedbackApi.resolveProblems(
                organizationId,
                employerId,
                problem.reportId,
                editableProblems,
                "employee-save",
              );
            }
            setSaved(true);
            setFormVersion(value => value + 1);
            onChanged();
          } catch (err) {
            setError(err instanceof Error ? err.message : "פרטי העובד נשמרו אך הכנת התיקון למשוב נכשלה.");
          }
        }}
      />
    </div> : null}
  </section>;
}
