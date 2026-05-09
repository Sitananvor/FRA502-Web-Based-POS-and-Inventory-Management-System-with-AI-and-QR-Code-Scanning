"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Trash2 } from "lucide-react";
import BaseTable from "./BaseTable";
import ConfirmDialog from "../../../src/components/modals/ConfirmDialog";
import type { Product } from "../../../src/types";
import { calcTotalStock, formatPrice } from "../../../src/lib/utils";

interface ProductTableProps {
  items: Product[];
  onDelete: (id: number) => Promise<void>;
  totalRows: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalGlobalStock: number;
}

export default function ProductTable({
  items = [],
  onDelete,
  totalRows,
  currentPage,
  onPageChange,
  pageSize = 20,
  totalGlobalStock,
}: ProductTableProps) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    productId: number | null;
  }>({ isOpen: false, productId: null });

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Item" },
    {
      key: "brand",
      label: "Brand",
      render: (row: any) => (row as Product).brand ?? "—",
    },
    {
      key: "category",
      label: "Category",
      render: (row: any) => (row as Product).categories?.name ?? "—",
    },
    {
      key: "stock",
      label: "Stock",
      render: (row: any) => {
        const p = row as Product;
        const stock = calcTotalStock(p.inventory_batches ?? []);
        const isLow = stock <= p.min_stock;
        return (
          <span className={isLow ? "font-bold text-red-500" : ""}>{stock}</span>
        );
      },
    },
    {
      key: "price",
      label: "Unit Price (THB)",
      render: (row: any) => formatPrice((row as Product).price),
    },
    {
      key: "qr_code", 
      label: "Product QR",
      render: (row: any) => {
        const p = row as Product;
        return p.qr_code ?? "—"; 
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => {
        const p = row as Product;
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => router.push(`/inventory/${p.id}/batches`)}
              className="p-1.5 rounded-lg text-[#0F4C81] hover:bg-[#D6E9FF] transition-colors"
              title="View Batches"
            >
              <Package size={20} />
            </button>
            <button
              onClick={() =>
                setConfirmDialog({ isOpen: true, productId: p.id })
              }
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 hover:bg-[#FEE2E2] transition-colors"
              title="Delete"
            >
              <Trash2 size={20} />
            </button>
          </div>
        );
      },
    },
  ];

  async function handleConfirmDelete() {
    if (confirmDialog.productId == null) return;
    await onDelete(confirmDialog.productId);
    
    setConfirmDialog({ isOpen: false, productId: null });
  }

  return (
    <>
      <BaseTable
        columns={columns as any}
        data={items as any}
        rowKey="id"
        rowText="No items found."
        footer={[
          {
            label: "Total Stock",
            value: `${totalGlobalStock.toLocaleString("th-TH")} pcs`,
            highlight: true,
          },
        ]}
        pageSize={pageSize}
        totalRows={totalRows}
        currentPage={currentPage}
        onPageChange={onPageChange}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Product?"
        message="This will also delete all batches. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, productId: null })}
      />
    </>
  );
}