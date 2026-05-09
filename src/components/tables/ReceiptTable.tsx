"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import BaseTable from "./BaseTable";
import ConfirmDialog from "../../../src/components/modals/ConfirmDialog";
import type { Sale } from "../../../src/types";
import { formatDateTime, formatPrice } from "../../../src/lib/utils";
import { getPagedReceiptsAction } from "../../../src/actions/Receipt";

interface ReceiptTableProps {
  onDelete: (id: number) => Promise<void>;
  pageSize?: number;
}

export default function ReceiptTable({
  onDelete,
  pageSize = 10,
}: ReceiptTableProps) {
  const [data, setData] = useState<Sale[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    saleId: number | null;
  }>({ isOpen: false, saleId: null });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const res = await getPagedReceiptsAction(currentPage, pageSize);

    if (res.success) {
      setData(res.data as Sale[]);
      setTotalRows(res.totalCount || 0);
      setGrandTotal(res.grandTotal || 0);
    } else {
      setErrorMsg((res as any).error || "Unknown error occurred");
      setData([]);
      setTotalRows(0);
      setGrandTotal(0);
    }
    setIsLoading(false);
  }, [currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    {
      key: "id",
      label: "Receipt ID",
      render: (row: any) => (
        <span className="font-mono text-[#0F4C81]">#{row.id}</span>
      ),
    },
    {
      key: "created_at",
      label: "Date & Time",
      render: (row: any) => formatDateTime(row.created_at),
    },
    {
      key: "total_amount",
      label: "Total Amount (THB)",
      render: (row: any) => formatPrice(row.total_amount),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <button
          onClick={() => setConfirmDialog({ isOpen: true, saleId: row.id })}
          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
          disabled={isLoading}
        >
          <Trash2 size={20} />
        </button>
      ),
    },
  ];

  async function handleConfirmDelete() {
    if (confirmDialog.saleId == null) return;
    await onDelete(confirmDialog.saleId);
    setConfirmDialog({ isOpen: false, saleId: null });
    loadData();
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Receipt History</h2>
        {isLoading && !errorMsg && (
          <div className="flex items-center gap-2 text-[#1767AD] text-sm font-medium animate-pulse">
            <Loader2 className="animate-spin" size={14} />
            Updating...
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm font-medium">
          <AlertCircle size={18} />
          Error: {errorMsg}
        </div>
      )}

      <div
        className={`transition-all duration-300 ${isLoading ? "blur-[0.7px] opacity-60 pointer-events-none" : "blur-0 opacity-100"}`}
      >
        <BaseTable
          columns={columns as any}
          data={data as any}
          rowKey="id"
          rowText={
            isLoading
              ? "Loading data from server..."
              : errorMsg
                ? "Cannot load data due to an error."
                : "No sales records found."
          }
          footer={[
            {
              label: "Total Sales",
              value: `฿${formatPrice(grandTotal)}`,
              highlight: true,
            },
          ]}
          pageSize={pageSize}
          totalRows={totalRows}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Receipt?"
        message="Are you sure you want to delete this receipt? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, saleId: null })}
      />
    </div>
  );
}
