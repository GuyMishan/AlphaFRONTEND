"use client";

import { toast } from "sonner";

const MAX_ERROR_LENGTH = 220;

function compactError(message: string) {
  const value = message.trim().replace(/\s+/g, " ");
  return value.length <= MAX_ERROR_LENGTH ? value : `${value.slice(0, MAX_ERROR_LENGTH - 1).trimEnd()}…`;
}

/**
 * Toast notifications (rendered by the single <Toaster> in the root layout).
 * `notify.error` compacts long multi-line backend/validation messages; use
 * `toast` from sonner directly when a toast needs a description or actions.
 */
export const notify = {
  error: (message: string) => { if (message.trim()) toast.error(compactError(message)); },
  success: (message: string) => { if (message.trim()) toast.success(message.trim()); },
  info: (message: string) => { if (message.trim()) toast.info(message.trim()); },
};
