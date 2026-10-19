"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { UiCheckbox } from "@/components/ui/ui-controls";
import type { LegalDocument } from "@/features/auth/api";

export function LegalConsentModal({ open, document, saving = false, required = false, onAccept, onClose }: {
  open: boolean;
  document: LegalDocument | null;
  saving?: boolean;
  required?: boolean;
  onAccept: (version: number) => Promise<void> | void;
  onClose?: () => void;
}) {
  const [checked, setChecked] = useState(false);
  useEffect(() => { if (open) setChecked(false); }, [open, document?.version]);
  return <AppModal open={open} title={required ? "תנאי השימוש עודכנו" : "תנאי השימוש ומדיניות הפרטיות"}
    subtitle={required ? "כדי להמשיך להשתמש ב־ALPHA, יש לאשר את הגרסה העדכנית." : "יש לעיין במסמך ולאשר אותו כדי להשלים את ההרשמה."}
    width="lg" onClose={onClose} closeOnBackdrop={!required && !saving} closeDisabled={saving}
    actions={<>
      {onClose ? <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>{required ? "התנתקות" : "חזרה"}</button> : null}
      <button className="btn btn-primary" type="button" disabled={(required && !checked) || saving || !document}
        onClick={() => { if (document) void onAccept(document.version); }}>{saving ? "שומר..." : "אישור והמשך"}</button>
    </>}>
    {document ? <>
      <p>{document.title}</p>
      <div role="document" dir="rtl" tabIndex={0} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: "45vh", overflowY: "auto" }}>{document.markdown}</div>
      {required ? <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}>
        <UiCheckbox checked={checked} onChange={(event) => setChecked(event.target.checked)} disabled={saving} />
        <span>קראתי ואני מאשר/ת את תנאי השימוש ומדיניות הפרטיות.</span>
      </label> : null}
    </> : <p role="status">טוען את תנאי השימוש...</p>}
  </AppModal>;
}
