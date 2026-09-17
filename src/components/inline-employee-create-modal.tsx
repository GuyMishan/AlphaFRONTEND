"use client";

import { useState } from "react";
import { Boxes, UserPlus, X } from "lucide-react";
import { EmployeeForm } from "@/components/employee-form";
import { EmployeePensionMix } from "@/components/employee-pension-mix";
import type { Employee } from "@/lib/types";

type Props = {
  organizationId: string;
  employerId: string;
  onClose: () => void;
  onCreated: (employee: Employee) => void | Promise<void>;
};

type Stage = "create" | "confirm-products" | "products";

export function InlineEmployeeCreateModal({ organizationId, employerId, onClose, onCreated }: Props) {
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [stage, setStage] = useState<Stage>("create");
  const [working, setWorking] = useState(false);

  async function handleCreated(employee: Employee) {
    setWorking(true);
    try {
      await onCreated(employee);
      setCreatedEmployee(employee);
      setStage("confirm-products");
    } finally {
      setWorking(false);
    }
  }

  async function finishProducts() {
    if (!createdEmployee) return;
    setWorking(true);
    try {
      // Re-sync after the pension mix was edited so the report can pick up the new employee defaults.
      await onCreated(createdEmployee);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  const title = stage === "create" ? "הקמת עובד חדש" : stage === "confirm-products" ? "העובד הוקם בהצלחה" : "עריכת מוצרים לעובד";
  const subtitle = stage === "create"
    ? "אותו טופס הקמת עובד של המערכת, בתוך הדיווח הנוכחי."
    : stage === "confirm-products"
      ? "העובד נוסף לדיווח. אפשר לערוך עכשיו את המוצרים שלו או להמשיך בדיווח."
      : createdEmployee ? `${createdEmployee.firstName} ${createdEmployee.lastName} · המוצרים נשמרים בתמהיל העובד כברירת מחדל לדיווחים.` : "";

  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onClose(); }}>
    <div className="report-modal report-modal-wide" role="dialog" aria-modal="true" aria-label={title}>
      <div className="report-modal-header">
        <div><h2>{title}</h2><span>{subtitle}</span></div>
        <button type="button" className="icon-button" disabled={working} onClick={onClose} aria-label="סגירה"><X size={18} /></button>
      </div>
      <div className="report-modal-body">
        {stage === "create" ? <EmployeeForm
          organizationId={organizationId}
          employerId={employerId}
          embedded
          onCancel={onClose}
          onSaved={handleCreated}
          submitLabel="הקמת עובד והוספה לדיווח"
        /> : null}

        {stage === "confirm-products" && createdEmployee ? <div className="employee-created-next-step">
          <div className="employee-created-icon"><UserPlus size={24} /></div>
          <div>
            <h3>{createdEmployee.firstName} {createdEmployee.lastName} נוסף לדיווח</h3>
            <p>האם ברצונך לערוך עכשיו את המוצרים הפנסיוניים של העובד?</p>
          </div>
          <div className="employee-created-actions">
            <button type="button" className="btn btn-secondary" disabled={working} onClick={onClose}>לא, המשך לדיווח</button>
            <button type="button" className="btn btn-primary" disabled={working} onClick={() => setStage("products")}><Boxes size={16} />כן, עריכת מוצרים</button>
          </div>
        </div> : null}

        {stage === "products" && createdEmployee ? <>
          <EmployeePensionMix organizationId={organizationId} employerId={employerId} employeeId={createdEmployee.id} editable />
          <div className="employee-created-actions employee-products-finish">
            <button type="button" className="btn btn-secondary" disabled={working} onClick={() => setStage("confirm-products")}>חזרה</button>
            <button type="button" className="btn btn-primary" disabled={working} onClick={() => void finishProducts()}>{working ? "מעדכן את הדיווח..." : "סיום וחזרה לדיווח"}</button>
          </div>
        </> : null}
      </div>
    </div>
  </div>;
}
