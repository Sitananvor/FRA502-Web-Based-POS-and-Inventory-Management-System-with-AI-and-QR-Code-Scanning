"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import BatchTable from "../../../../components/tables/BatchTable"; 
import AddBatchModal from "../../../../components/modals/AddBatchModal";
import Button from "../../../../components/ui/Button"; 
import { deleteBatchAction } from "../../../../actions/Batch"; 
import type { InventoryBatch } from "../../../../types";

interface BatchClientProps {
  productId: number;
  productName: string;
  productBrand?: string | null;
  initialBatches: InventoryBatch[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  totalProductStock: number; 
}

export default function BatchClient({
  productId,
  productName,
  productBrand,
  initialBatches,
  totalRows,
  currentPage,
  pageSize,
  totalProductStock, 
}: BatchClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async (batchId: number) => {
    const res = await deleteBatchAction(batchId);
    if (res.success) {
      router.refresh(); 
    } else {
      alert(res.error || "Failed to delete batch.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[29px] font-bold text-gray-800">Batch Management</h1>
      </div>

    <div className="bg-white p-6 rounded-2xl border border-[#EBF4FF] shadow-sm relative"> 
        
        <div className="absolute top-6 right-6">
            <Button label="Add Batch" onClick={() => setIsAddModalOpen(true)} />
        </div>

        <BatchTable
          items={initialBatches}
          productName={productName}
          productBrand={productBrand}
          onBack={() => router.push("/inventory")}
          onDelete={handleDelete}
          totalRows={totalRows}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          totalProductStock={totalProductStock} 
        />
    </div>

      <AddBatchModal
        isOpen={isAddModalOpen}
        productId={productId}
        productName={productName}
        productBrand={productBrand}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          router.refresh(); 
        }}
      />
    </div>
  );
}