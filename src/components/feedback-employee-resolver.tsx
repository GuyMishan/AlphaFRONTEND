"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { EmployeeForm } from "@/components/employee-form";
import { alphaApi } from "@/lib/api";
import type { FeedbackResolutionGroup } from "@/lib/report-feedback-api";
import type { Employee } from "@/lib/types";

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
    alphaApi.employee(organizationId, employerId, employmentId)
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
    const changed = fields.filter(([key]) =>
      (problem.reportedValues[key] ?? "") !== (problem.currentValues[key] ?? ""));
    const selected = changed.length ? changed : fields.filter(([key]) =>
      problem.reportedValues[key] != null || problem.currentValues[key] != null);
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
        <h3>בדיקת פרטי העובד</h3>
        <p>הדיווח המקורי נשאר היסטורי ולא משתנה. כאן מעדכנים את נתוני העובד הנוכחיים בלבד.</p>
      </div>
    </div>

    <div className="feedback-resolution-compare" role="table" aria-label="השוואת פרטי עובד">
      <div className="feedback-resolution-compare-head" role="row">
        <b role="columnheader">שדה</b>
        <b role="columnheader">בדיווח</b>
        <b role="columnheader">כיום</b>
      </div>
      {comparison.map(row => <div className="feedback-resolution-compare-row" role="row" key={row.key}>
        <span role="cell">{row.label}</span>
        <span role="cell" dir="auto">{row.reported}</span>
        <span role="cell" dir="auto">{row.current}</span>
      </div>)}
    </div>

    {!canEdit ? <div className="notice notice-error">
      <AlertTriangle size={16} aria-hidden="true" />אין לך הרשאת עריכת עובד. ניתן לצפות בהשוואה אך לא לשנות נתונים.
    </div> : null}

    {saved ? <div className="notice notice-info">
      <CheckCircle2 size={16} aria-hidden="true" />
      פרטי העובד עודכנו. המשוב ההיסטורי נשאר פתוח עד שיישלח תיקון ויתקבל משוב חדש.
    </div> : null}

    {loading ? <div className="empty">טוען את פרטי העובד...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {!loading && !error && employee ? <div className="feedback-resolution-employee-form">
      <EmployeeForm
        key={`${employee.id}:${formVersion}`}
        organizationId={organizationId}
        employerId={employerId}
        employee={employee}
        editable={canEdit}
        embedded
        submitLabel="שמירת פרטי העובד"
        onSaved={async savedEmployee => {
          setEmployee(savedEmployee);
          setSaved(true);
          setFormVersion(value => value + 1);
          onChanged();
        }}
      />
    </div> : null}
  </section>;
}
