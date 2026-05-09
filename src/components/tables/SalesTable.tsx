"use client";

import BaseTable from "../../../src/components/tables/BaseTable";

export interface CartItem {
  itemKey: string;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  batches: { id: number; stock_amount: number; expiry_date: string | null }[];
}

function QuantityControl({
  item,
  onQuantityChange,
}: {
  item: CartItem;
  onQuantityChange: (key: string, qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onQuantityChange(item.itemKey, item.quantity - 1)}
        className="w-7 h-7 flex items-center justify-center rounded bg-[#EBF4FF] hover:bg-[#BFDBFE] text-[#0F4C81] font-bold transition-colors"
      >
        −
      </button>
      <input
        type="number"
        value={item.quantity}
        min={0}
        max={item.maxStock}
        onChange={(e) => onQuantityChange(item.itemKey, Number(e.target.value))}
        className="w-14 text-center text-sm border border-[#BFDBFE] rounded py-1 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30"
      />
      <button
        onClick={() => onQuantityChange(item.itemKey, item.quantity + 1)}
        disabled={item.quantity >= item.maxStock}
        className="w-7 h-7 flex items-center justify-center rounded bg-[#EBF4FF] hover:bg-[#BFDBFE] text-[#0F4C81] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}

interface SalesTableProps {
  items: CartItem[];
  onQuantityChange: (key: string, qty: number) => void;
}

export default function SalesTable({
  items = [],
  onQuantityChange,
}: SalesTableProps) {
  const totalQuantity = items.reduce(
    (sum, r) => sum + Number(r.quantity ?? 0),
    0,
  );
  const totalPrice = items.reduce(
    (sum, r) => sum + Number(r.price ?? 0) * Number(r.quantity ?? 0),
    0,
  );

  const columns = [
    { key: "name", label: "Item" },
    {
      key: "quantity",
      label: "Quantity",
      render: (row: any) => (
        <QuantityControl
          item={row as CartItem}
          onQuantityChange={onQuantityChange}
        />
      ),
    },
    {
      key: "price",
      label: "Unit Price (THB)",
      render: (row: any) => Number((row as CartItem).price).toLocaleString(),
    },
    {
      key: "total",
      label: "Amount (THB)",
      render: (row: any) => {
        const item = row as CartItem;
        return (Number(item.price) * Number(item.quantity)).toLocaleString(
          undefined,
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        );
      },
    },
  ];

  const footer = [
    { label: "Total Items", value: String(totalQuantity), highlight: true },
    {
      label: "Total (THB)",
      value: totalPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      highlight: true,
    },
  ];

  return (
    <BaseTable
      columns={columns as any}
      data={items as any}
      rowKey="itemKey"
      rowText="Scan QR Code or detect product to add items"
      footer={footer}
    />
  );
}
