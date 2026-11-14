'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Dense, sortable, paginated grid (TanStack Table). CSV export reflects the
 * current sorted order and only the rows/columns shown — no hidden data leaves
 * the client. Numbers are tabular; identifiers stay monospace via column defs.
 */
export function DataGrid<T>({
  columns,
  data,
  pageSize = 10,
  exportName = 'acttolog-export',
  emptyText = 'No rows in this period.',
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pageSize?: number;
  exportName?: string;
  emptyText?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const exportCsv = () => {
    const leaf = table.getAllLeafColumns();
    const header = leaf.map((c) => csvCell(typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id));
    const lines = table.getSortedRowModel().rows.map((r) => leaf.map((c) => csvCell(r.getValue(c.id))).join(','));
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = table.getRowModel().rows;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="dim mono text-[10.4px]">
          {table.getSortedRowModel().rows.length.toLocaleString('en-US')} rows
        </span>
        <button className="btn btn-g btn-sm" onClick={exportCsv} disabled={!data.length}>
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--line)' }}>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} style={{ background: 'var(--panel2)' }}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="mono dim px-3 py-2 text-left text-[9.6px] font-medium tracking-[.14em] uppercase"
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    {h.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 uppercase"
                        onClick={h.column.getToggleSortingHandler()}
                        disabled={!h.column.getCanSort()}
                        style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default' }}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === 'asc' && <span>▲</span>}
                        {h.column.getIsSorted() === 'desc' && <span>▼</span>}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length} className="mut px-3 py-6 text-center text-[12.6px]">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="dim mono text-[10.4px]">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button className="btn btn-g btn-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Prev
            </button>
            <button className="btn btn-g btn-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}