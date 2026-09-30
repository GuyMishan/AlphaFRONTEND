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
  const [productSaveSignal, setProductSaveSignal] = useState(0);

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

  return <AppModal title={title} subtitle={subtitle} onClose={onClose} closeDisabled={working}
      closeOnBackdrop={!working} width="xl" bodyClassName="report-modal-body"
      actions={stage === "create" ? <>
        <button type="button" className="btn btn-secondary" disabled={working} onClick={onClose}>ביטול</button>
        <button type="submit" form="inline-employee-create-form" className="btn btn-primary" disabled={working}>
          <UserPlus size={16} />{working ? "יוצר..." : "הקמת עובד"}
        </button>
      </> : stage === "confirm-products" ? <>
        <button type="button" className="btn btn-secondary" disabled={working} onClick={() => void addToReportAndClose()}>
          {working ? "מוסיף לדיווח..." : "לא, הוסף לדיווח וסגור"}
        </button>
        <button type="button" className="btn btn-primary" disabled={working} onClick={() => setStage("products")}>
          <Boxes size={16} />כן, עריכת מוצרים
        </button>
      </> : <>
        <button type="button" className="btn btn-secondary" disabled={working}
          onClick={() => setStage("confirm-products")}>חזרה</button>
        <button type="button" className="btn btn-primary" disabled={working}
          onClick={() => setProductSaveSignal(value => value + 1)}>
          {working ? "שומר..." : "סיום, שמירה והוספה לדיווח"}
        </button>
      </>}>
      {stage === "create" ? <EmployeeForm
        organizationId={organizationId} employerId={employerId}
        embedded formId="inline-employee-create-form" hideActions
        onSavingChange={setWorking} onCancel={onClose} onSaved={handleCreated}
        submitLabel="הקמת עובד" /> : null}
      {stage === "confirm-products" && createdEmployee ? <div className="employee-created-next-step">
        <div className="employee-created-icon"><UserPlus size={24} /></div>
        <div>
          <h3>{createdEmployee.firstName} {createdEmployee.lastName} הוקם בהצלחה</h3>
          <p>אפשר לערוך את התמהיל הפנסיוני שלו לפני הוספתו לדיווח.</p>
        </div>
      </div> : null}
      {stage === "products" && createdEmployee ? <EmployeePensionMix
        organizationId={organizationId} employerId={employerId} employeeId={createdEmployee.id}
        editable hideHeaderSave externalSaveSignal={productSaveSignal}
        onSavingChange={setWorking} onSaved={addToReportAndClose} /> : null}
    </AppModal>;
}
