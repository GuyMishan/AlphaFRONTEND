"use client";

import { useState } from "react";
import { Boxes, UserPlus } from "lucide-react";
import { AppModal } from "@/components/app-modal";
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

  function handleCreated(employee: Employee) {
    setCreatedEmployee(employee);
    setStage("confirm-products");
  }

  async function addToReportAndClose() {
    if (!createdEmployee) return;
    setWorking(true);
    try {
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
      ? "לפני הוספת העובד לדיווח אפשר לערוך את התמהיל שלו, כדי שהמוצרים ייכנסו לדיווח כברירת מחדל."
      : createdEmployee ? `${createdEmployee.firstName} ${createdEmployee.lastName} · המוצרים נשמרים בתמהיל העובד כברירת מחדל לדיווחים.` : "";

  return <AppModal title={title} subtitle={subtitle} onClose={working ? undefined : onClose} closeOnBackdrop={!working} width="xl" bodyClassName="report-modal-body">
        {stage === "create" ? <EmployeeForm
          organizationId={organizationId}
          employerId={employerId}
          embedded
          onCancel={onClose}
          onSaved={handleCreated}
          submitLabel="הקמת עובד"
        /> : null}

        {stage === "confirm-products" && createdEmployee ? <div className="employee-created-next-step">
          <div className="employee-created-icon"><UserPlus size={24} /></div>
          <div>
            <h3>{createdEmployee.firstName} {createdEmployee.lastName} הוקם בהצלחה</h3>
            <p>האם ברצונך לערוך עכשיו את המוצרים הפנסיוניים של העובד לפני הוספתו לדיווח?</p>
          </div>
          <div className="employee-created-actions">
            <button type="button" className="btn btn-secondary" disabled={working} onClick={() => void addToReportAndClose()}>{working ? "מוסיף לדיווח..." : "לא, הוסף לדיווח וסגור"}</button>
            <button type="button" className="btn btn-primary" disabled={working} onClick={() => setStage("products")}><Boxes size={16} />כן, עריכת מוצרים</button>
          </div>
        </div> : null}

        {stage === "products" && createdEmployee ? <>
          <EmployeePensionMix organizationId={organizationId} employerId={employerId} employeeId={createdEmployee.id} editable />
          <div className="employee-created-actions employee-products-finish">
            <button type="button" className="btn btn-secondary" disabled={working} onClick={() => setStage("confirm-products")}>חזרה</button>
            <button type="button" className="btn btn-primary" disabled={working} onClick={() => void addToReportAndClose()}>{working ? "מוסיף לדיווח..." : "סיום, הוספה לדיווח וחזרה"}</button>
          </div>
        </> : null}
      </AppModal>;
}
