/**
 * The resolved working scope for the current page, published by ScopeController
 * after it validates the saved selection against the user's access scope (and
 * whenever the user changes organization, employer or employee).
 *
 * Pages subscribe to reload their data for the new scope. The selection itself
 * is persisted in the app store (src/lib/session); this channel only signals
 * "the page scope is now resolved/changed".
 */
export type ScopeChange = {
  organizationId: string;
  employerId?: string;
  employeeId?: string;
};

type ScopeChangeListener = (change: ScopeChange) => void;

const listeners = new Set<ScopeChangeListener>();

export function publishScopeChange(change: ScopeChange) {
  listeners.forEach((listener) => listener(change));
}

/** Returns an unsubscribe function, suitable as a useEffect cleanup. */
export function subscribeToScopeChanges(listener: ScopeChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
