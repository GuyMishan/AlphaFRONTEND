"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const labelHints: Array<[RegExp, string[]]> = [
  [/שם פרטי/, ["שם פרטי"]], [/שם משפחה/, ["שם משפחה"]], [/שם מלא|שם משפטי/, ["שם מלא", "שם משפטי"]],
  [/תעודת זהות|ת״ז/, ["תעודת זהות", "ת״ז"]], [/מספר עובד/, ["מספר עובד"]], [/תאריך תחילת עבודה|תאריך תחילת/, ["תאריך תחילת"]],
  [/שכר חודשי/, ["שכר חודשי"]], [/מספר חברה|עוסק/, ["מספר חברה", "עוסק"]], [/תיק ניכויים/, ["תיק ניכויים"]],
  [/אימייל|דוא״ל/, ["אימייל", "דוא״ל"]], [/טלפון/, ["טלפון"]], [/מספר פוליסה|פוליסה/, ["מספר פוליסה", "פוליסה"]],
  [/חודש שכר/, ["חודש שכר"]], [/סוג דיווח/, ["סוג דיווח"]], [/רובד שכר|רובד/, ["רובד שכר", "רובד"]],
  [/סעיף 14/, ["תאריך תחילת סעיף 14", "סעיף 14"]], [/קופה/, ["קופה", "קרן", "יצרן"]],
  [/שם יצרן|יצרן/, ["שם יצרן", "יצרן"]], [/חשבון יצרן/, ["חשבון יצרן"]], [/אמצעי תשלום|אופן התשלום|אופן החזר/, ["אמצעי תשלום", "אופן החזר"]],
  [/תאריך ערך/, ["תאריך ערך"]], [/אסמכתא/, ["אסמכתא"]], [/מספר בנק|בנק/, ["מספר בנק", "בנק"]],
  [/סניף/, ["סניף"]], [/מספר חשבון|חשבון/, ["מספר חשבון", "מס׳ חשבון", "חשבון"]], [/אחוז מהשכר|אחוז/, ["אחוז מהשכר", "אחוז"]],
  [/תקרת שכר|שכר קבוע|ערך הקצאת/, ["תקרת שכר", "שכר קבוע", "ערך הקצאה"]],
  [/סוג פעולה/, ["סוג פעולה"]], [/מעמד הפקדה/, ["מעמד הפקדה"]], [/סטטוס עובד/, ["סטטוס עובד"]],
  [/תאריך תחילת סטטוס/, ["תאריך תחילת סטטוס"]], [/הפקדה אחרונה/, ["הפקדה אחרונה"]], [/סיבת בקשה להחזר|סיבת בקשה/, ["סיבת בקשה"]],
  [/סוג חשבון מעסיק/, ["סוג חשבון מעסיק"]], [/סוג חשבון קולט/, ["סוג חשבון קולט"]], [/חלקיות משרה/, ["חלקיות משרה"]],
  [/ימי עבודה בחודש/, ["ימי עבודה בחודש"]], [/מספר זיהוי קודם/, ["מספר זיהוי קודם"]], [/מספר מסלקה קודם/, ["מספר מסלקה קודם"]],
  [/חריג רשמי|חריג מתאים|חריג להיעדר/, ["חריג להיעדר מזהה קודם"]],
];

function findScope(element: Element) {
  return element.closest("form, .payment-modal, .report-modal, .card, .wizard, main") ?? document.body;
}

function fieldByLabel(scope: Element, hints: string[]) {
  const fields = Array.from(scope.querySelectorAll<HTMLElement>(".field"));
  return fields.find((field) => {
    const label = field.querySelector("label")?.textContent?.trim() ?? "";
    return hints.some((hint) => label.includes(hint));
  });
}

function productScope(scope: Element, message: string) {
  const match = message.match(/מוצר\s+(\d+)/);
  if (!match) return scope;
  const index = Number(match[1]) - 1;
  const cards = scope.querySelectorAll<HTMLElement>(".report-product-card");
  return cards[index] ?? scope;
}

function markField(field: HTMLElement, message: string) {
  field.classList.add("field-invalid");
  field.dataset.error = message;
  field.dataset.validationErrorTitle = "true";
  field.title = message;
  const control = field.querySelector<HTMLElement>("input, select, textarea, button[role='combobox']");
  control?.setAttribute("aria-invalid", "true");
  if (control) {
    control.dataset.validationErrorTitle = "true";
    control.title = message;
  }
  field.querySelector(".legacy-field-error")?.remove();
}

function clearField(field: HTMLElement) {
  field.classList.remove("field-invalid");
  delete field.dataset.error;
  if (field.dataset.validationErrorTitle === "true") {
    field.removeAttribute("title");
    delete field.dataset.validationErrorTitle;
  }
  const control = field.querySelector<HTMLElement>("input, select, textarea, button[role='combobox']");
  control?.removeAttribute("aria-invalid");
  if (control?.dataset.validationErrorTitle === "true") {
    control.removeAttribute("title");
    delete control.dataset.validationErrorTitle;
  }
  field.querySelector(".legacy-field-error")?.remove();
}

function splitValidationMessages(message: string) {
  return message
    .split(/(?<=[.!?])\s+(?=[א-תA-Za-z])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function handleNotice(element: HTMLElement) {
  if (element.dataset.validationUxHandled === "true") return;
  const message = element.textContent?.trim();
  if (!message) return;
  element.dataset.validationUxHandled = "true";
  element.style.display = "none";

  const baseScope = findScope(element);
  const messages = splitValidationMessages(message);
  const unmatched: string[] = [];

  for (const item of messages) {
    let matched = false;
    const scope = productScope(baseScope, item);
    for (const [pattern, hints] of labelHints) {
      if (!pattern.test(item)) continue;
      const field = fieldByLabel(scope, hints);
      if (!field) continue;
      markField(field, item);
      matched = true;
      break;
    }
    if (!matched) unmatched.push(item);
  }

  if (unmatched.length) toast.error(unmatched.join(" "));
}

export function ValidationUxBridge() {
  useEffect(() => {
    const process = (root: ParentNode = document) => root.querySelectorAll<HTMLElement>(".notice.notice-error").forEach(handleNotice);
    process();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(".notice.notice-error")) handleNotice(node);
        process(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const clear = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const field = target.closest<HTMLElement>(".field-invalid");
      if (field) clearField(field);
    };
    document.addEventListener("input", clear, true);
    document.addEventListener("change", clear, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", clear, true);
      document.removeEventListener("change", clear, true);
    };
  }, []);
  return null;
}
