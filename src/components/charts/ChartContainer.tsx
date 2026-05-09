"use client";

import type { ReactNode } from "react";

interface FilterOption {
  value: string;
  label: string;
}
interface ChartContainerProps {
  title?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: readonly FilterOption[];
  children: ReactNode;
}

export default function ChartContainer({
  title,
  filterValue,
  onFilterChange,
  filterOptions,
  children,
}: ChartContainerProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-7">
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h2 className="text-[18px] font-semibold text-gray-700">{title}</h2>
        )}
        {filterOptions && filterOptions.length > 0 && (
          <select
            value={filterValue}
            onChange={(e) => onFilterChange?.(e.target.value)}
            className="text-[14px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {filterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mb-[7px]">{children}</div>
    </div>
  );
}
