"use client";

import Link from "next/link";
import { CSSProperties, ComponentProps, Fragment, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DataTableColumn = { key: string; label: ReactNode; width?: string };

export function DataTableLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}

type Props<T> = {
  items: T[];
  columns: DataTableColumn[];
  rowKey: (item: T) => string;
  renderCells: (item: T) => ReactNode[];
  /** Optional per-row detail panel; not mounted for rows outside the virtual viewport. */
  expandedRowComponent?: (item: T) => ReactNode;
  /** Fixed expanded panel height, or a height per row (as in the original VirtualizedList). */
  expandedRowComponentSize?: number | ((item: T) => number);
  /** Controlled expansion by stable rowKey; omit to use DataTable-managed state. */
  expandedRowKeys?: ReadonlySet<string>;
  defaultExpandedRowKeys?: readonly string[];
  onExpandedRowChange?: (rowKey: string, expanded: boolean, item: T) => void;
  /** Optional row-click expansion; the expander button always works independently. */
  expandOnRowClick?: boolean;
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
  items, columns, rowKey, renderCells, expandedRowComponent, expandedRowComponentSize = 240,
  expandedRowKeys, defaultExpandedRowKeys = [], onExpandedRowChange, expandOnRowClick = false,
  rowHeight = 56, maxHeight = 520, overscan = 10,
  loadMoreThreshold = 8, tableClassName = "", wrapperClassName = "", onRowClick,
  loading = false, loadingMore = false, loadingLabel = "טוען נתונים...",
  loadingMoreLabel = "טוען נתונים נוספים...", emptyState = "לא נמצאו נתונים.",
  hasMore = false, onLoadMore,
}: Props<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const tableId = useId();
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<ReadonlySet<string>>(
    () => new Set(defaultExpandedRowKeys),
  );
  const activeExpandedKeys = expandedRowKeys ?? internalExpandedKeys;
  const toggleExpanded = (item: T) => {
    if (!expandedRowComponent) return;
    const key = rowKey(item);
    const next = !activeExpandedKeys.has(key);
    if (expandedRowKeys === undefined) {
      setInternalExpandedKeys((previous) => {
        const updated = new Set(previous);
        if (next) updated.add(key); else updated.delete(key);
        return updated;
      });
    }
    onExpandedRowChange?.(key, next, item);
  };
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

  // Height offsets are indexed by the stable row order, not rendered DOM rows.
  // Including expanded panels in the prefix sum keeps spacers and infinite
  // loading correct even after an expanded row scrolls out of the DOM.
  const offsets = useMemo(() => {
    const result = [0];
    for (const item of items) {
      const expanded = Boolean(expandedRowComponent && activeExpandedKeys.has(rowKey(item)));
      const panelHeight = expanded
        ? Math.max(1, typeof expandedRowComponentSize === "function"
          ? expandedRowComponentSize(item) : expandedRowComponentSize)
        : 0;
      result.push(result[result.length - 1] + rowHeight + panelHeight);
    }
    return result;
  }, [items, rowHeight, rowKey, expandedRowComponent, expandedRowComponentSize, activeExpandedKeys]);

  // First row whose bottom extends past the requested pixel offset.
  const indexAtOffset = (offset: number) => {
    let low = 0;
    let high = items.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (offsets[middle + 1] <= offset) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const visibleStart = Math.min(items.length, indexAtOffset(Math.max(0, scrollTop)));
  const visibleStop = items.length === 0 ? -1
    : Math.min(items.length - 1, indexAtOffset(scrollTop + viewportHeight));
  const firstRenderIndex = Math.max(0, visibleStart - overscan);
  const lastRenderIndex = Math.min(items.length - 1, visibleStop + overscan);
  const visibleItems = useMemo(() => items.slice(firstRenderIndex, lastRenderIndex + 1),
    [items, firstRenderIndex, lastRenderIndex]);
  const topSpacerHeight = offsets[firstRenderIndex];
  const bottomSpacerHeight = Math.max(0, offsets[items.length] - offsets[lastRenderIndex + 1]);

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
            {visibleItems.map((item, offset) => {
              const key = rowKey(item);
              const index = firstRenderIndex + offset;
              const expanded = Boolean(expandedRowComponent && activeExpandedKeys.has(key));
              const panelHeight = expanded ? Math.max(1, typeof expandedRowComponentSize === "function"
                ? expandedRowComponentSize(item) : expandedRowComponentSize) : 0;
              const panelId = `${tableId}-expanded-${index}`;
              return <Fragment key={key}>
                <tr className="data-table-row" style={{ height: rowHeight, cursor: onRowClick || (expandedRowComponent && expandOnRowClick) ? "pointer" : undefined }}
                  onClick={(event) => {
                    onRowClick?.(item);
                    if (expandOnRowClick && expandedRowComponent && !(event.target as HTMLElement).closest("button, a, input, select, textarea, [role='button']"))
                      toggleExpanded(item);
                  }}>
                  {renderCells(item).map((cell, cellIndex) => <td key={columns[cellIndex]?.key ?? cellIndex}>
                    {cellIndex === 0 && expandedRowComponent ? <button type="button" className="data-table-expand-toggle"
                      aria-label={expanded ? "סגירת פרטי השורה" : "הצגת פרטי השורה"}
                      aria-expanded={expanded} aria-controls={panelId}
                      onClick={(event) => { event.stopPropagation(); toggleExpanded(item); }}>
                      <ChevronDown size={16} className={expanded ? "data-table-chevron-expanded" : ""} />
                    </button> : null}
                    {cell}
                  </td>)}
                </tr>
                {expanded ? <tr className="data-table-expanded-row" id={panelId}>
                  <td colSpan={columns.length} style={{ height: panelHeight, padding: 0 }}>
                    <div className="data-table-expanded-frame" style={{ height: panelHeight }}>
                      {expandedRowComponent?.(item)}
                    </div>
                  </td>
                </tr> : null}
              </Fragment>;
            })}
            {bottomSpacerHeight > 0 ? <tr aria-hidden="true" className="virtual-spacer"><td colSpan={columns.length} style={{ height: bottomSpacerHeight, padding: 0, border: 0 }} /></tr> : null}
            {loadingMore ? <tr className="data-table-loading-more"><td colSpan={columns.length}><div className="empty">{loadingMoreLabel}</div></td></tr> : null}
          </>}
        </tbody>
      </table>
    </div>
  </div>;
}
