"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { deleteProductAction } from "../../actions/Inventory";
import SearchComponent from "../../components/ui/Search";
import ProductTable from "../../components/tables/ProductTable";
import Button from "../../components/ui/Button";
import AddProductModal from "../../components/modals/AddProductModal";

interface InventoryClientProps {
  products: any[];
  totalRows: number;
  currentPage: number;
  searchQuery: string;
  pageSize: number;
  totalGlobalStock: number;
}

// Debounce helper 
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

export default function InventoryClient({
  products,
  totalRows,
  currentPage,
  searchQuery,
  pageSize,
  totalGlobalStock,
}: InventoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [, startTransition] = useTransition();

  const [inputValue, setInputValue] = useState(searchQuery);

  const updateURL = useCallback(
    (params: URLSearchParams) => {
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router]
  );

  const pushSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams);
      term ? params.set("query", term) : params.delete("query");
      params.set("page", "1");
      updateURL(params);
    },
    [searchParams, updateURL]
  );

  // Debounce 400ms — พิมพ์เสร็จค่อยยิง request
  const debouncedSearch = useDebounce(pushSearch, 400);

  const handleSearchChange = (term: string) => {
    setInputValue(term);      
    debouncedSearch(term);     
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    updateURL(params);
  };

  const handleDelete = async (id: number) => {
    const res = await deleteProductAction(id);
    if (res.success) router.refresh();
    else alert(res.error || "Failed to delete item.");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[29px] font-bold text-gray-800">Inventory Management</h1>
      <div className="bg-white p-6 rounded-2xl border border-[#EBF4FF] shadow-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <SearchComponent value={inputValue} onChange={handleSearchChange} />
          <Button label="Add Product" onClick={() => setIsAddModalOpen(true)} />
        </div>
        <ProductTable
          items={products}
          onDelete={handleDelete}
          totalRows={totalRows}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          totalGlobalStock={totalGlobalStock}
        />
      </div>
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}