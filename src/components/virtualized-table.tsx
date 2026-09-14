"use client";

import { ReactNode, useMemo, useState } from "react";

type Column = { key: string; label: ReactNode; width?: string };

type Props<T> = {
  items: T[];
  columns: Column[];
  rowKey: (item: T) => string;
  renderCells: (item: T) => ReactNode[];
  rowHeight?: number;
  maxHeight?: number;
  overscan?: number;
  tableClassName?: string;
  wrapperClassName?: string;
  onRowClick?: (item: T) => void;
};

export function VirtualizedTable<T>({ items, columns, rowKey, renderCells, rowHeight = 56, maxHeight = 520, overscan = 6, tableClassName = "", wrapperClassName = "", onRowClick }: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRows = Math.ceil(maxHeight / rowHeight);
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(items.length, start + viewportRows + overscan * 2);
  const visible = useMemo(() => items.slice(start, end), [items, start, end]);
  const top = start * rowHeight;
  const bottom = Math.max(0, (items.length - end) * rowHeight);

  return <div className={`table-wrap virtual-table-wrap ${wrapperClassName}`.trim()} style={{ maxHeight, overflowY: "auto" }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
    <table className={tableClassName}>
      <thead><tr>{columns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined}>{column.label}</th>)}</tr></thead>
      <tbody>
        {top > 0 ? <tr aria-hidden="true" className="virtual-spacer"><td colSpan={columns.length} style={{ height: top, padding: 0, border: 0 }} /></tr> : null}
        {visible.map((item) => <tr key={rowKey(item)} onClick={() => onRowClick?.(item)} style={{ height: rowHeight, cursor: onRowClick ? "pointer" : undefined }}>{renderCells(item).map((cell, index) => <td key={columns[index]?.key ?? index}>{cell}</td>)}</tr>)}
        {bottom > 0 ? <tr aria-hidden="true" className="virtual-spacer"><td colSpan={columns.length} style={{ height: bottom, padding: 0, border: 0 }} /></tr> : null}
      </tbody>
    </table>
  </div>;
}
