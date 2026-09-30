"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import { UiInput } from "@/components/ui-controls";

/** Unified, accessible file picker. Storage and validation remain the caller's responsibility. */
export function UiFileUpload({ id, label, description, accept, maxBytes, disabled = false, busy = false,
  fileName, variant = "button", className = "", icon, onFileSelected, onInvalid }: {
  id?: string; label: string; description?: string; accept: string; maxBytes?: number;
  disabled?: boolean; busy?: boolean; fileName?: string; variant?: "button" | "zone" | "field";
  className?: string; icon?: ReactNode; onFileSelected: (file: File) => void | Promise<void>;
  onInvalid?: (message: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  function choose(file: File | null) {
    if (!file || disabled || busy) return;
    if (maxBytes && file.size > maxBytes) { onInvalid?.("הקובץ גדול מדי."); return; }
    const formats = accept.split(",").map((part) => part.trim().toLowerCase());
    const extension = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!formats.some((format) => format === extension || (format.endsWith("/*") && file.type.startsWith(format.slice(0, -1))) || (format.includes("/") && file.type.toLowerCase() === format))) {
      onInvalid?.("סוג הקובץ אינו נתמך."); return;
    }
    void onFileSelected(file);
  }
  function keyboard(event: KeyboardEvent<HTMLLabelElement>) {
    if ((event.key === "Enter" || event.key === " ") && !disabled && !busy && event.target === event.currentTarget) {
      event.preventDefault(); ref.current?.click();
    }
  }
  function drop(event: DragEvent<HTMLLabelElement>) {
    if (variant !== "zone") return;
    event.preventDefault(); setDragging(false);
    choose(event.dataTransfer.files[0] ?? null);
  }
  return <label htmlFor={id} tabIndex={disabled || busy ? -1 : 0}
    aria-disabled={disabled || busy} aria-label={label} onKeyDown={keyboard}
    className={[
      variant === "zone" ? "upload-zone" : variant === "field" ? "ui-file-field" : "ui-file-button",
      dragging ? "drag-active" : "", className,
    ].filter(Boolean).join(" ")}
    onDragEnter={variant === "zone" ? (event) => { event.preventDefault(); setDragging(true); } : undefined}
    onDragOver={variant === "zone" ? (event) => event.preventDefault() : undefined}
    onDragLeave={variant === "zone" ? (event) => { if (event.currentTarget === event.target) setDragging(false); } : undefined}
    onDrop={drop}>
    {variant === "zone" ? <>{icon ?? <UploadCloud size={38} />}<h3>{fileName || label}</h3>{description ? <p>{description}</p> : null}<span className="btn btn-soft">{busy ? "מעבד קובץ..." : "בחירת קובץ"}</span></>
      : <>{icon ?? (variant === "button" ? <FileUp size={15} /> : null)}<span>{busy ? "מעלה..." : fileName || label}</span>{description ? <small>{description}</small> : null}</>}
    <UiInput ref={ref} id={id} type="file" accept={accept} hidden={variant !== "field"}
      disabled={disabled || busy} className="ui-file-native" onChange={(event) => {
        const picked = event.currentTarget.files?.[0] ?? null;
        event.currentTarget.value = "";
        choose(picked);
      }} />
  </label>;
}
