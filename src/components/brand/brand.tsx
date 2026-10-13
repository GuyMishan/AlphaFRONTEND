import { AlphaLogo } from "@/components/brand/alpha-logo";

/** Product lockup: the Alpha logo with the Hebrew product line under it. */
export function Brand({ tagline = "תפעול פנסיוני", className }: { tagline?: string | null; className?: string }) {
  return <div className={["brand", className].filter(Boolean).join(" ")}>
    <AlphaLogo className="brand-logo" />
    {tagline ? <span className="brand-tagline">{tagline}</span> : null}
  </div>;
}
