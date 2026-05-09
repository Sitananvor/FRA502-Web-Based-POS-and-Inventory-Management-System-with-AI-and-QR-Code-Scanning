"use client";

import { Check } from "lucide-react";
import type { CartItem } from "../../../src/components/tables/SalesTable";
import { formatPrice, formatDateTime } from "../../../src/lib/utils";

export interface Receipt {
  saleId: number;
  createdAt: Date;
  items: CartItem[];
}

interface SaleReceiptProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export default function SaleReceipt({ receipt, onClose }: SaleReceiptProps) {
  if (!receipt) return null;
  const { saleId, createdAt, items } = receipt;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F4C81] text-white px-6 py-5 text-center">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Check size={20} className="text-white" />
          </div>
          <h2 className="text-lg font-bold">Checkout Successful</h2>
          <p className="text-[#90CAF9] text-xs mt-1">
            Bill #{saleId} · {formatDateTime(createdAt.toISOString())}
          </p>
        </div>

        {/* Items */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto divide-y divide-[#EBF4FF]">
          {items.map((item) => (
            <div key={item.itemKey} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-gray-400 text-xs">×{item.quantity}</p>
              </div>
              <span className="font-semibold text-gray-700">
                {formatPrice(Number(item.price) * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-[#EBF4FF] px-6 py-4 bg-[#F0F7FF]">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Total Items</span>
            <span>{totalQuantity} {totalQuantity > 1 ? "pcs" : "pc"}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-800 mb-4">
            <span>Total</span>
            <span className="text-[#0F4C81]">฿{formatPrice(totalAmount)}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1767AD] hover:bg-[#0F4C81] text-white font-semibold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}