import { useEffect, useState } from "react";

/** Returns true while the request it was issued for is still the latest one. */
export type IsCurrentRequest = () => boolean;

export type RequestGuard = {
  /** Starts a request and makes every earlier one stale. */
  begin: () => IsCurrentRequest;
  /** Makes every started request stale (unmount, scope cleared). */
  cancel: () => void;
};

export function createRequestGuard(): RequestGuard {
  let latest = 0;
  return {
    begin() {
      const id = ++latest;
      return () => id === latest;
    },
    cancel() {
      latest += 1;
    },
  };
}

/**
 * Drops responses that arrive after a newer load started or after unmount, so switching
 * organization or employer never lets a slow reply for the previous one overwrite the screen:
 *
 *   const requests = useLatestRequest(organizationId, employerId);
 *   const isCurrent = requests.begin();
 *   const value = await api.load(organizationId);
 *   if (!isCurrent()) return;
 *
 * Optional scope keys: when any of them changes, every pending request becomes stale.
 */
export function useLatestRequest(...scope: Array<string | number | null | undefined>): RequestGuard {
  const [guard] = useState(createRequestGuard);
  const scopeKey = scope.map((part) => String(part ?? "")).join("\u0000");
  // Cleanup runs before the effects of the next render, so loads started for the new scope stay current.
  useEffect(() => () => guard.cancel(), [guard, scopeKey]);
  return guard;
}
