"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ScanLine, Cpu, ShoppingCart, Trash2, Search } from "lucide-react";

import SalesTable from "../../components/tables/SalesTable";
import SaleReceipt from "../../components/modals/SaleReceipt";
import Button from "../../components/ui/Button";
import { calcTotalStock } from "../../lib/utils";
import {
  resolveScannedCodeAction,
  processCheckoutAction,
} from "../../actions/Pos";
import type { CartItem } from "../../components/tables/SalesTable";

const QRScanner = dynamic(() => import("../../components/pos/QRScanner"), {
  ssr: false,
  loading: () => <ScannerPlaceholder label="Starting Camera..." />,
});

const AIDetector = dynamic(() => import("../../components/pos/AIDetector"), {
  ssr: false,
  loading: () => <ScannerPlaceholder label="Loading AI Model..." />,
});

// Placeholder ระหว่างโหลด/เปิดกล้อง Scanner
function ScannerPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64 bg-[#F0F7FF] rounded-2xl border-2 border-dashed border-[#BFDBFE]">
      <p className="text-[#1767AD] animate-pulse font-medium text-[14px]">
        {label}
      </p>
    </div>
  );
}

const SCAN_COOLDOWN_MS = 1000;

type InputMode = "qr" | "ai";

export default function PosClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<{
    saleId: number;
    createdAt: Date;
    items: CartItem[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("ai");
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const lastScanTime = useRef(0);
  const itemsRef = useRef<CartItem[]>([]);
  const alertPendingRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleScanResult = useCallback(async (code: string, skipCooldown = false) => {
  const now = Date.now();
  
  if (!skipCooldown && now - lastScanTime.current < SCAN_COOLDOWN_MS) return;
  if (!skipCooldown) lastScanTime.current = now;

  try {
    const resolved = await resolveScannedCodeAction(code);
    if (!resolved.success) {
      alert(`Product not found: ${code}`);
      return;
    }
    const { product, batches, isBatchScan } = resolved;

    if (!product) {
      alert(`Product data missing for code: ${code}`);
      return;
    }
    if (!batches || batches.length === 0) {
      alert(`Product ${product.name} is out of stock!`);
      return;
    }

    const totalStock = calcTotalStock(batches as CartItem["batches"]);
    if (totalStock === 0) {
      alert(`Product ${product.name} is out of stock!`);
      return;
    }

    const itemKey = isBatchScan
      ? `batch_${batches[0].id}`
      : `product_${product.id}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.itemKey === itemKey);
      
      if (existingIndex > -1) {
        const existingItem = prev[existingIndex];
        
        if (existingItem.quantity + 1 > totalStock) {
          if (!alertPendingRef.current) {
            alertPendingRef.current = true;
            setTimeout(() => { alertPendingRef.current = false; }, 500);
            alert(`Insufficient stock for ${product.name}! (Only ${totalStock} available)`);
          }
          return prev;
        }
        
        return prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      
      return [
        ...prev,
        {
          itemKey,
          product_id: product.id as number,
          name: product.name as string,
          price: product.price as number,
          quantity: 1,
          maxStock: totalStock,
          batches: batches as CartItem["batches"],
        },
      ];
    });
  } catch (err) {
    console.error("Scan error:", err);
  }
}, []);

  const handleManualSearch = useCallback(async () => {
    const code = manualCode.trim();
    if (!code) return;
    setIsSearching(true);
    try {
      await handleScanResult(code, true);
    } finally {
      setIsSearching(false);
      setManualCode("");
    }
  }, [manualCode, handleScanResult]);

  const handleUpdateQuantity = useCallback(
    (itemKey: string, newQty: number) => {
      if (newQty < 0) return;
      setItems((prev) =>
        prev
          .map((item) => {
            if (item.itemKey !== itemKey) return item;
            if (newQty > item.maxStock) {
              if (!alertPendingRef.current) {
                alertPendingRef.current = true;
                setTimeout(() => {
                  alertPendingRef.current = false;
                }, 0);
                alert(
                  `Quantity exceeds available stock! (Only ${item.maxStock} left)`,
                );
              }
              return { ...item, quantity: item.maxStock };
            }
            return { ...item, quantity: newQty };
          })
          .filter((item) => item.quantity > 0),
      );
    },
    [],
  );

  const handleCheckout = useCallback(async () => {
    if (itemsRef.current.length === 0) return;
    setIsProcessing(true);
    try {
      const payload = itemsRef.current.map((item) => ({
        product_id: item.product_id,
        price: item.price,
        quantity: item.quantity,
        batches: item.batches.map((b: any) => ({
          id: b.id,
          stock_amount: b.stock_amount,
          expiry_date: b.expiry_date ?? null,
        })),
      }));
      const result = await processCheckoutAction(payload);
      if (!result.success) throw new Error(result.error);
      setReceipt({
        saleId: result.saleId!,
        createdAt: new Date(),
        items: [...itemsRef.current],
      });
      setItems([]);
    } catch (err: any) {
      alert("Checkout failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-5">
        <h1 className="text-[29px] font-bold text-gray-800">Point of Sale</h1>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#EBF4FF] shadow-sm p-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left */}
          <section className="lg:col-span-5 space-y-4">
            {/* Mode selector */}
            <div className="flex rounded-xl overflow-hidden border border-[#BFDBFE] bg-[#F0F7FF] p-1 gap-1 relative z-10">
              <button
                type="button"
                onClick={() => setInputMode("ai")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer leading-none ${
                  inputMode === "ai"
                    ? "bg-[#1767AD] text-white shadow-sm"
                    : "text-[#1767AD] hover:bg-[#BFDBFE]/50"
                }`}
              >
                <Cpu size={14} />
                Detecting Products
              </button>
              <button
                type="button"
                onClick={() => setInputMode("qr")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer leading-none ${
                  inputMode === "qr"
                    ? "bg-[#1767AD] text-white shadow-sm"
                    : "text-[#1767AD] hover:bg-[#BFDBFE]/50"
                }`}
              >
                <ScanLine size={14} />
                Scan Product QR
              </button>
            </div>

            {/* QR Scanner */}
            {inputMode === "qr" && (
              <div className="space-y-3">
                <QRScanner onScanResult={handleScanResult} />
                <p className="text-center text-xs text-gray-400 px-2">
                  Place QR code in frame to detect product
                </p>
              </div>
            )}

            {/* AI Detector */}
            {inputMode === "ai" && (
              <div className="space-y-3">
                <AIDetector onScanResult={handleScanResult} />
                <p className="text-center text-xs text-gray-400 px-2">
                  Point camera at product to detect and identify it
                </p>
              </div>
            )}

            {/* Manual code input */}
            <div className="flex flex-row sm:flex-row gap-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                placeholder="Search products, batch no., or QR code…"
                className="flex-1 px-4 py-2.5 min-w-0 rounded-xl border border-[#BFDBFE] bg-[#F8FBFF] text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1767AD]/30 focus:border-[#1767AD]"
              />
              <button
                onClick={handleManualSearch}
                disabled={isSearching}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-[#1767AD] hover:bg-[#0F4C81] text-white text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {isSearching ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={15} />
                )}
              </button>
            </div>
          </section>

          {/* Right */}
          <section className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#0F4C81]">
                <div className="w-1.5 h-5 bg-[#1767AD] rounded-full" />
                <ShoppingCart size={18} />
                <h2 className="font-semibold text-base text-[18px]">
                  Current Order
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={() => setItems([])}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Clear cart"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <SalesTable items={items} onQuantityChange={handleUpdateQuantity} />

            <div className="mt-4 pt-5">
              <Button
                label={isProcessing ? "Processing..." : "Checkout"}
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 text-base font-bold rounded-xl shadow-md shadow-blue-100 transition-all active:scale-[0.99]"
              />
            </div>
          </section>
        </div>
      </div>

      <SaleReceipt receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
