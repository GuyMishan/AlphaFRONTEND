import { AlphaSymbol } from "@/components/brand/alpha-logo";

/**
 * Full-screen branded loader for app bootstrap: restoring the session, resolving the access
 * scope, and redirects. It only fades in after a short CSS delay, so it never flashes when
 * the work finishes quickly. Page content uses skeletons instead.
 */
export function AppLoader({ label = "טוען את סביבת העבודה..." }: { label?: string }) {
  return <div className="app-loader" role="status" aria-live="polite" aria-atomic="true">
    <div className="app-loader-mark"><AlphaSymbol animated className="app-loader-symbol" /></div>
    <div className="app-loader-progress" aria-hidden="true"><span /></div>
    <p className="app-loader-label">{label}</p>
  </div>;
}
