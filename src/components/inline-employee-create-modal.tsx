"use client";

import { useState } from "react";
import { Boxes, UserPlus, X } from "lucide-react";
import { EmployeeForm } from "@/components/employee-form";
import type { Employee } from "@/lib/types";

type Props = {
  organizationId: string;
  employerId: string;
  onClose: () => void;
  onCreated: (employee: Employee) => void | Promise<void>;
  onEditProducts: (employee: Employee) => void | Promise<void>;
};

export function InlineEmployeeCreateModal({ organizationId, employerId, onClose, onCreated, onEditProducts }: Props) {
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [working, setWorking] = useState(false);

  async function handleCreated(employee: Employee) {
    setWorking(true);
    try {
      await onCreated(employee);
      setCreatedEmployee(employee);
    } finally {
      setWorking(false);
    }
  }

  async function editProducts() {
    if (!createdEmployee) return;
    setWorking(true);
    try {
      await onEditProducts(createdEmployee);
      onClose();
    } finally {
      setWorking(false);
    }
  }

  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !working) onClose(); }}>
    <div className="report-modal report-modal-wide" role="dialog" aria-modal="true" aria-label="הקמת עובד חדש">
      <div className="report-modal-header">
        <div>
          <h2>{createdEmployee ? "העובד הוקם בהצלחה" : "הקמת עובד חדש"}</h2>
          <span>{createdEmployee ? "העובד נוסף לדיווח. אפשר לערוך עכשיו את המוצרים שלו או להמשיך בדיווח." : "אותו טופס הקמת עובד של המערכת, בתוך הדיווח הנוכחי."}</span>
        </div>
        <button type="button" className="icon-button" disabled={working} onClick={onClose} aria-label="סגירה"><X size={18} /></button>
      </div>
      <div className="report-modal-body">
        {createdEmployee ? <div className="employee-created-next-step">
          <div className="employee-created-icon"><UserPlus size={24} /></div>
          <div>
            <h3>{createdEmployee.firstName} {createdEmployee.lastName} נוסף לדיווח</h3>
            <p>האם ברצונך לערוך עכשיו את המוצרים הפנסיוניים של העובד בדיווח?</p>
          </div>
          <div className="employee-created-actions">
            <button type="button" className="btn btn-secondary" disabled={working} onClick={onClose}>לא, המשך לדיווח</button>
            <button type="button" className="btn btn-primary" disabled={working} onClick={() => void editProducts()}><Boxes size={16} />כן, עריכת מוצרים</button>
          </div>
        </div> : <EmployeeForm
          organizationId={organizationId}
          employerId={employerId}
          embedded
          onCancel={onClose}
          onSaved={handleCreated}
          submitLabel="הקמת עובד והוספה לדיווח"
        />}
      </div>
    </div>
  </div>;
}
