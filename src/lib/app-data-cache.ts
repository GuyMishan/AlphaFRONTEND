import { alphaApi } from "./api";
import { appStore } from "./app-store";
import type { GlobalScopeContext } from "./types";

let scopePromise: Promise<GlobalScopeContext> | null = null;

export function getScopeContext(force = false): Promise<GlobalScopeContext> {
  if (force) {
    scopePromise = null;
    appStore.getState().setScope(null);
  }

  const cached = appStore.getState().scope;
  if (cached) return Promise.resolve(cached);

  if (!scopePromise) {
    scopePromise = alphaApi.scope()
      .then((value) => {
        appStore.getState().setScope(value);
        return value;
      })
      .finally(() => {
        scopePromise = null;
      });
  }

  return scopePromise;
}

export function invalidateScopeContext() {
  scopePromise = null;
  appStore.getState().setScope(null);
}

export function refreshScopeContext() {
  return getScopeContext(true);
}
