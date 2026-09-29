import { alphaApi } from "./api";
import type { GlobalScopeContext } from "./types";

let scopeValue: GlobalScopeContext | null = null;
let scopePromise: Promise<GlobalScopeContext> | null = null;

export function getScopeContext(force = false): Promise<GlobalScopeContext> {
  if (force) {
    scopeValue = null;
    scopePromise = null;
  }
  if (scopeValue) return Promise.resolve(scopeValue);
  if (!scopePromise) {
    scopePromise = alphaApi.scope()
      .then((value) => {
        scopeValue = value;
        return value;
      })
      .finally(() => {
        scopePromise = null;
      });
  }
  return scopePromise;
}

export function invalidateScopeContext() {
  scopeValue = null;
  scopePromise = null;
}

export function refreshScopeContext() {
  return getScopeContext(true);
}
