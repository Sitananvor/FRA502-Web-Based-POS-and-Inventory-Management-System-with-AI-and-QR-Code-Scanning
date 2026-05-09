import type { InventoryBatch, Product } from "../types";

export const formatPrice = (value: number | string): string =>
  Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
};

export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateStr));
};

export const calcTotalStock = (
  inventory_batches: Pick<InventoryBatch, "stock_amount">[] = [],
): number => inventory_batches.reduce((sum, b) => sum + Number(b.stock_amount || 0), 0);

export const getLowStockCount = (products: Product[]): number =>
  products.filter((p) => {
    const stock = calcTotalStock(p.inventory_batches ?? []);
    return stock > 0 && stock <= Number(p.min_stock || 0);
  }).length;

export const getExpiringCount = (products: Product[]): number => {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = new Date();
  return products.filter((p) =>
    (p.inventory_batches ?? []).some((b) => {
      if (!b.expiry_date) return false;
      const diff = new Date(b.expiry_date).getTime() - now.getTime();
      return diff > 0 && diff <= THIRTY_DAYS_MS;
    }),
  ).length;
};

export const getStartDate = (filter: "week" | "month" | "year"): string => {
  const d = new Date();
  d.setHours(d.getHours() + 7);
  if (filter === "week") d.setDate(d.getDate() - d.getDay());
  else if (filter === "month") d.setDate(1);
  else if (filter === "year") d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  d.setHours(d.getHours() - 7);
  return d.toISOString();
};

export const getWidestFilter = (
  f1: "week" | "month" | "year",
  f2: "week" | "month" | "year",
): "week" | "month" | "year" => {
  const rank = { week: 1, month: 2, year: 3 };
  return rank[f1] >= rank[f2] ? f1 : f2;
};