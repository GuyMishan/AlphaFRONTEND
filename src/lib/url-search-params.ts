/**
 * Updates the current URL's query in place (no navigation, no new history entry) and keeps
 * Next's useSearchParams/usePathname in sync, e.g. for the selected profile tab.
 *
 * Always pass `null` as the history state: Next copies its own internal state into the entry.
 * Passing `window.history.state` (which carries Next's internal markers) makes Next treat the
 * call as its own and skip the sync, so the URL would change while the screen stays the same.
 */
export function replaceSearchParams(update: (params: URLSearchParams) => void) {
  const url = new URL(window.location.href);
  update(url.searchParams);
  const query = url.searchParams.toString();
  window.history.replaceState(null, "", `${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
}
