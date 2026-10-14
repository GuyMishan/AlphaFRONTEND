/**
 * Web Storage that never throws. Storage can be unavailable (server rendering) or blocked
 * (site data disabled, some private modes, quota exceeded); then reads return null and
 * writes are skipped, so callers keep working on in-memory state for the current page.
 */
export type StorageArea = "local" | "session";

function area(kind: StorageArea): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    // Merely reading window.localStorage throws a SecurityError when site data is blocked.
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStorage(kind: StorageArea, key: string): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(kind: StorageArea, key: string, value: string): void {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    // Not persisted: the value lives only in memory for this page.
  }
}

export function removeStorage(kind: StorageArea, key: string): void {
  try {
    area(kind)?.removeItem(key);
  } catch {
    // Nothing persisted to remove, or storage is blocked.
  }
}
