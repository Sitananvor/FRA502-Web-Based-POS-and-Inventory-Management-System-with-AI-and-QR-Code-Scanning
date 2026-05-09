"use client";

import { useState } from "react";
import { Trash2, ArrowLeft } from "lucide-react";
import BaseTable from "./BaseTable";
import ConfirmDialog from "../modals/ConfirmDialog";
import { formatDate } from "../../../src/lib/utils";
import type { InventoryBatch } from "../../../src/types";

function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-gray-400">—</span>;
  const daysLeft = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  const cls = daysLeft < 0
    ? "text-red-500 font-bold"
    : daysLeft <= 30
    ? "text-amber-500 font-bold"
    : "text-gray-700";
  return <span className={cls}>{formatDate(date)}</span>;
}

interface BatchTableProps {
  items: InventoryBatch[];
  productName?: string;
  productBrand?: string | null;
  onBack: () => void;
  onDelete: (id: number) => Promise<void>;
  totalRows: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalProductStock: number;
}

export default function BatchTable({
  items = [], productName = "Product", productBrand,
  onBack, onDelete, totalRows, currentPage, onPageChange, pageSize = 20,
  totalProductStock 
}: BatchTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; batchId: number | null }>({ isOpen: false, batchId: null });

  const columns = [
    { key: "batch_number", label: "Batch No.", render: (row: any) => (row as InventoryBatch).batch_number ?? "—" },
    { key: "batch_qr",     label: "Batch QR",  render: (row: any) => (row as InventoryBatch).batch_qr ?? "—" },
    { key: "stock_amount", label: "Stock" },
    { key: "expiry_date",  label: "Expiry Date",  render: (row: any) => <ExpiryCell date={(row as InventoryBatch).expiry_date} /> },
    { key: "received_date",label: "Received",      render: (row: any) => formatDate((row as InventoryBatch).received_date) },
    {
      key: "actions", label: "Actions",
      render: (row: any) => {
        const b = row as InventoryBatch;
        return (
          <button
            onClick={() => setConfirmDialog({ isOpen: true, batchId: b.id })}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 size={20} />
          </button>
        );
      },
    },
  ];

  async function handleConfirmDelete() {
    if (confirmDialog.batchId == null) return;
    await onDelete(confirmDialog.batchId);
    setConfirmDialog({ isOpen: false, batchId: null });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#EBF4FF] transition-colors text-[#0F4C81]">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {productName}{productBrand ? ` (${productBrand})` : ""}
        </h2>
      </div>

      <BaseTable
        columns={columns as any}
        data={items as any}
        rowKey="id"
        rowText="No batches found."
        footer={[{ label: "Total Stock", value: `${totalProductStock.toLocaleString("th-TH")} pcs`, highlight: true }]}
        pageSize={pageSize}
        totalRows={totalRows}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Batch?"
        message="Stock from this batch will be removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, batchId: null })}
      />
    </div>
  );
}