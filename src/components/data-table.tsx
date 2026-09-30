"use client";

import Link from "next/link";
import { CSSProperties, ComponentProps, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DataTableColumn = { key: string; label: ReactNode; width?: string };

export function DataTableLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}

type Props<T> = {
  items: T[];
  columns: DataTableColumn[];
  rowKey: (item: T) => string;
  renderCells: (item: T) => ReactNode[];
  rowHeight?: number;
  maxHeight?: number;
  overscan?: number;
  loadMoreThreshold?: number;
  tableClassName?: string;
  wrapperClassName?: string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  loadingMore?: boolean;
  loadingLabel?: ReactNode;
  loadingMoreLabel?: ReactNode;
  emptyState?: ReactNode;
  hasMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
};

export function DataTable<T>({
  items, columns, rowKey, renderCells, rowHeight = 56, maxHeight = 520, overscan = 10,
  loadMoreThreshold = 8, tableClassName = "", wrapperClassName = "", onRowClick,
  loading = false, loadingMore = false, loadingLabel = "טוען נתונים...",
  loadingMoreLabel = "טוען נתונים נוספים...", emptyState = "לא נמצאו נתונים.",
  hasMore = false, onLoadMore,
}: Props<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const loadRequestedRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateHeight = () => setViewportHeight(viewport.clientHeight || maxHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [maxHeight]);

  useEffect(() => {
    if (!loadingMore) loadRequestedRef.current = false;
  }, [loadingMore, items.length]);

  const visibleStart = Math.max(0, Math.floor(scrollTop / rowHeight));
  const visibleStop = Math.min(items.length - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight));
  const firstRenderIndex = Math.max(0, visibleStart - overscan);
  const lastRenderIndex = Math.min(items.length - 1, visibleStop + overscan);
  const visibleItems = useMemo(() => items.slice(firstRenderIndex, lastRenderIndex + 1), [items, firstRenderIndex, lastRenderIndex]);
  const topSpacerHeight = firstRenderIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (items.length - lastRenderIndex - 1) * rowHeight);

  const requestMoreIfNeeded = useCallback(() => {
    if (!hasMore || !onLoadMore || loading || loadingMore || loadRequestedRef.current) return;
    if (items.length - 1 - visibleStop > loadMoreThreshold) return;
    loadRequestedRef.current = true;
    void onLoadMore();
  }, [hasMore, onLoadMore, loading, loadingMore, items.length, visibleStop, loadMoreThreshold]);

  useEffect(() => { requestMoreIfNeeded(); }, [requestMoreIfNeeded]);

  return <div className="data-table">
    <div ref={viewportRef} className={`table-wrap data-table-viewport ${wrapperClassName}`.trim()} style={{ maxHeight, overflow: "auto", scrollbarGutter: "stable" }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <table className={`data-table-grid ${tableClassName}`.trim()} style={{ "--data-table-row-height": `${rowHeight}px` } as CSSProperties}>
        <colgroup>{columns.map((column) => <col key={column.key} style={column.width ? { width: column.width } : undefined} />)}</colgroup>
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {loading && items.length === 0 ? <tr><td colSpan={columns.length}><div className="empty">{loadingLabel}</div></td></tr> : items.length === 0 ? <tr><td colSpan={columns.length}><div className="empty">{emptyState}</div></td></tr> : <>
            {topSpacerHeight > 0 ? <tr aria-hidden="true" className="virtual-spacer"><td colSpan={columns.length} style={{ height: topSpacerHeight, padding: 0, border: 0 }} /></tr> : null}
            {visibleItems.map((item) => <tr key={rowKey(item)} onClick={() => onRowClick?.(item)} className="data-table-row" style={{ height: rowHeight, cursor: onRowClick ? "pointer" : undefined }}>{renderCells(item).map((cell, index) => <td key={columns[index]?.key ?? index}>{cell}</td>)}</tr>)}
            {bottomSpacerHeight > 0 ? <tr aria-hidden="true" className="virtual-spacer"><td colSpan={columns.length} style={{ height: bottomSpacerHeight, padding: 0, border: 0 }} /></tr> : null}
            {loadingMore ? <tr className="data-table-loading-more"><td colSpan={columns.length}><div className="empty">{loadingMoreLabel}</div></td></tr> : null}
          </>}
        </tbody>
      </table>
    </div>
  </div>;
}
