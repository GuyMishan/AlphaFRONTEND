import type { CSSProperties } from "react";

/**
 * Skeleton placeholders. Every pattern reserves the size of the content it stands in for,
 * so the real content replaces it without a layout shift. Widths are deterministic
 * (no randomness) so server and client render the same markup.
 *
 * Primitives are decorative (aria-hidden). Patterns that stand alone (PageSkeleton,
 * TableSkeleton with a label) announce the loading state once through role="status".
 */
type Size = number | string;

export function Skeleton({ width, height, radius, className, style }: {
  width?: Size;
  height?: Size;
  radius?: "sm" | "md" | "lg" | "full";
  className?: string;
  style?: CSSProperties;
}) {
  return <span aria-hidden="true" style={{ width, height, ...style }}
    className={["skeleton", radius ? `skeleton-radius-${radius}` : "", className].filter(Boolean).join(" ")} />;
}

const TEXT_WIDTHS = ["100%", "92%", "84%", "96%", "70%"];

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return <span className="skeleton-text" aria-hidden="true">
    {Array.from({ length: lines }, (_, index) => (
      <Skeleton key={index} width={index === lines - 1 && lines > 1 ? "58%" : TEXT_WIDTHS[index % TEXT_WIDTHS.length]} />
    ))}
  </span>;
}

function LoadingAnnouncement({ label }: { label: string }) {
  return <span className="sr-only" role="status">{label}</span>;
}

const CELL_WIDTHS = ["72%", "54%", "64%", "40%", "58%", "46%"];

/** Deterministic, varied cell width for skeleton table rows (shared with DataTable). */
export function skeletonCellWidth(row: number, column: number) {
  return CELL_WIDTHS[(row + column * 2) % CELL_WIDTHS.length];
}

/** Table placeholder sized like DataTable rows (header + rows). */
export function TableSkeleton({ rows = 6, columns = 4, rowHeight = 56, label }: {
  rows?: number;
  columns?: number;
  rowHeight?: number;
  label?: string;
}) {
  const style = { "--skeleton-columns": columns, "--skeleton-row-height": `${rowHeight}px` } as CSSProperties;
  return <div className="skeleton-table" style={style} aria-busy={label ? true : undefined}>
    {label ? <LoadingAnnouncement label={label} /> : null}
    <div className="skeleton-table-row skeleton-table-head" aria-hidden="true">
      {Array.from({ length: columns }, (_, column) => <Skeleton key={column} width="45%" height={10} />)}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div key={row} className="skeleton-table-row" aria-hidden="true">
        {Array.from({ length: columns }, (_, column) => (
          <Skeleton key={column} width={skeletonCellWidth(row, column)} height={column === 0 ? 14 : 12} />
        ))}
      </div>
    ))}
  </div>;
}

/** Card placeholder: heading, short description and body lines. Pass `label` when it stands alone. */
export function CardSkeleton({ lines = 3, className, label }: { lines?: number; className?: string; label?: string }) {
  return <div className={["card", "skeleton-card", className].filter(Boolean).join(" ")} aria-busy={label ? true : undefined}>
    {label ? <LoadingAnnouncement label={label} /> : null}
    <span className="skeleton-text" aria-hidden="true">
      <Skeleton width="34%" height={18} />
      <Skeleton width="52%" height={12} />
    </span>
    <SkeletonText lines={lines} />
  </div>;
}

/** Placeholder for a row of StatCards. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return <div className="grid stats" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="stat-card">
        <div className="stat-top"><Skeleton width="42%" height={13} /><Skeleton width={40} height={40} radius="lg" /></div>
        <Skeleton width="38%" height={28} radius="sm" />
        <Skeleton width={84} height={20} radius="full" />
      </div>
    ))}
  </div>;
}

function PageHeadSkeleton({ action = true }: { action?: boolean }) {
  return <div className="skeleton-head" aria-hidden="true">
    <div>
      <Skeleton width="min(260px, 70%)" height={28} radius="sm" />
      <Skeleton width="min(380px, 90%)" height={14} />
    </div>
    {action ? <Skeleton width={150} height={44} radius="md" /> : null}
  </div>;
}

/** Form/profile placeholder: entity summary plus a grid of labelled fields. */
export function FormSkeleton({ fields = 8, label }: { fields?: number; label?: string }) {
  return <div className="card skeleton-card" aria-busy={label ? true : undefined}>
    {label ? <LoadingAnnouncement label={label} /> : null}
    <div className="skeleton-row-flex" aria-hidden="true">
      <Skeleton width={56} height={56} radius="lg" />
      <span className="skeleton-text" style={{ flex: 1 }}><Skeleton width="30%" height={18} /><Skeleton width="44%" /></span>
    </div>
    <div className="skeleton-field-grid" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="skeleton-field"><Skeleton width="48%" height={11} /><Skeleton height={44} radius="md" /></div>
      ))}
    </div>
  </div>;
}

export type PageSkeletonVariant = "table" | "dashboard" | "form";

/** Whole-page placeholder for route loading boundaries and screens resolving their first data. */
export function PageSkeleton({ variant = "table", label = "טוען את העמוד..." }: { variant?: PageSkeletonVariant; label?: string }) {
  return <div className="skeleton-stack" aria-busy="true">
    <LoadingAnnouncement label={label} />
    {variant === "dashboard"
      ? <Skeleton height={164} className="skeleton-hero" />
      : <PageHeadSkeleton action={variant !== "form"} />}
    {variant === "dashboard" ? <>
      <StatGridSkeleton />
      <div className="skeleton-split"><CardSkeleton lines={5} /><CardSkeleton lines={4} /></div>
    </> : variant === "form" ? <FormSkeleton /> : <div className="card skeleton-card" aria-hidden="true">
      <div className="skeleton-row-flex"><Skeleton height={44} radius="md" /><Skeleton width={88} height={24} radius="full" /></div>
      <TableSkeleton rows={6} />
    </div>}
  </div>;
}
