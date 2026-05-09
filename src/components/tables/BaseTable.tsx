"use client";

import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; }
interface FooterStat { label: string; value: string; highlight?: boolean; }
interface BaseTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  rowKey?: string;
  rowText?: string;
  footer?: FooterStat[];
  pageSize?: number;
  totalRows?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

function getPageNumbers(totalPages: number, currentPage: number): (number | "...")[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
}

function Pagination({ currentPage, totalPages, totalRows, pageSize, onPageChange }: {
  currentPage: number; totalPages: number; totalRows: number;
  pageSize: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalRows);

  const navBtn = "p-1.5 rounded-lg border border-[#BFDBFE] bg-[#F0F7FF] text-[#0F4C81] hover:bg-[#BFDBFE] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-sm text-gray-500">{from} – {to} of {totalRows}</span>
      <div className="flex items-center gap-1">
        {[
          { icon: ChevronsLeft,  action: () => onPageChange(1),               disabled: currentPage === 1 },
          { icon: ChevronLeft,   action: () => onPageChange(currentPage - 1), disabled: currentPage === 1 },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <button key={i} onClick={action} disabled={disabled} className={navBtn}>
            <Icon size={14} />
          </button>
        ))}

        {getPageNumbers(totalPages, currentPage).map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="px-1.5 text-gray-400 text-sm">…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 text-sm rounded-lg font-medium border transition-colors
                ${p === currentPage
                  ? "bg-[#0F4C81] border-[#0F4C81] text-white"
                  : "bg-[#F0F7FF] border-[#BFDBFE] text-[#0F4C81] hover:bg-[#BFDBFE]"
                }`}>
              {p}
            </button>
          )
        )}

        {[
          { icon: ChevronRight,  action: () => onPageChange(currentPage + 1), disabled: currentPage === totalPages },
          { icon: ChevronsRight, action: () => onPageChange(totalPages),       disabled: currentPage === totalPages },
        ].map(({ icon: Icon, action, disabled }, i) => (
          <button key={i} onClick={action} disabled={disabled} className={navBtn}>
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BaseTable<T extends Record<string, unknown>>({
  columns = [], data = [], rowKey = "id", rowText = "No data available",
  footer = [], pageSize = 15, totalRows = 0, currentPage = 1, onPageChange,
}: BaseTableProps<T>) {
  const totalPages = Math.ceil(totalRows / pageSize);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[#DBEAFE] shadow-sm">
        <table className="w-full text-sm text-center">
          <thead className="bg-[#EBF4FF] border-b-2 border-[#BFDBFE]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold uppercase tracking-wide text-xs text-[#1e4d7b] text-center">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBF4FF] bg-white">
            {data.length > 0 ? (
              data.map((row) => (
                <tr key={String(row[rowKey])} className="hover:bg-[#F3F4F6] transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 text-center">
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">{rowText}</td>
              </tr>
            )}
          </tbody>
          {footer.length > 0 && (
            <tfoot className="bg-[#F0F7FF] border-t-2 border-[#BFDBFE]">
              <tr>
                <td colSpan={columns.length} className="px-4 py-3">
                  <div className="flex justify-end gap-6">
                    {footer.map((stat) => (
                      <div key={stat.label} className="flex gap-1.5 text-sm">
                        <span className="text-[#4a6fa5] font-medium">{stat.label}:</span>
                        <span className={`font-bold ${stat.highlight ? "text-[#0F4C81]" : "text-[#2d3748]"}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {onPageChange && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}