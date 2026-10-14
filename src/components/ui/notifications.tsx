"use client";

import { toast, type ExternalToast } from "sonner";

/**
 * Toast notifications rendered by the single AlphaToaster in the root layout.
 * Keep error details intact. Use options for descriptions/actions and pass
 * `duration: Infinity` for critical errors that must remain until dismissed.
 */
export const notify = {
  error: (message: string, options?: ExternalToast) => { if (message.trim()) toast.error(message.trim(), options); },
  success: (message: string, options?: ExternalToast) => { if (message.trim()) toast.success(message.trim(), options); },
  info: (message: string, options?: ExternalToast) => { if (message.trim()) toast.info(message.trim(), options); },
};
