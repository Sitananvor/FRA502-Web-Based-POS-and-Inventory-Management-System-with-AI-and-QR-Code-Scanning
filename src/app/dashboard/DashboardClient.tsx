"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  PackageMinus,
  ClockAlert,
  PackageOpen,
} from "lucide-react";
import { DashboardData } from "../../hooks/DashboardData";
import { formatPrice } from "../../lib/utils";
import type { Sale, Product } from "../../types";

import Cards from "../../components/ui/Card";
import ChartContainer from "../../components/charts/ChartContainer";
import TopChart from "../../components/charts/TopChart";
import SalesChart from "../../components/charts/SalesChart";
import ReceiptTable from "../../components/tables/ReceiptTable";

const TIME_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
] as const;

interface Props {
  initialData: { products: Product[]; sales: Sale[]; todaySales: number };
  serverStats: { todaySales: number; lowStockCount: number; expiringCount: number; totalInventory: number };
}

export default function DashboardClient({ initialData, serverStats }: Props) {
  const [salesFilter, setSalesFilter] = useState<"week" | "month" | "year">("month");
  const [topItemsFilter, setTopItemsFilter] = useState<"week" | "month" | "year">("month");

  const { sales, deleteReceipt } = DashboardData(
    salesFilter,
    topItemsFilter,
    initialData,
  );

  const handleDeleteReceipt = async (id: number) => {
    const { error } = await deleteReceipt(id);
    if (error) alert("Unable to delete receipt");
  };

  const salesChartData = useMemo(() => {
    const now = new Date();
    const grouped: Record<string, { name: string; total: number }> = {};

    if (salesFilter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
        grouped[key] = {
          name: d.toLocaleDateString("en-GB", { weekday: "short" }),
          total: 0,
        };
      }
    } else if (salesFilter === "month") {
      for (let i = 1; i <= 5; i++)
        grouped[`W${i}`] = { name: `Week ${i}`, total: 0 };
    } else if (salesFilter === "year") {
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        const key = d
          .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
          .substring(0, 7);
        grouped[key] = {
          name: d.toLocaleDateString("en-GB", { month: "short" }),
          total: 0,
        };
      }
    }

    sales.forEach((s: Sale) => {
      const date = new Date(s.created_at);
      const key = s.created_at.split("T")[0];
      if (salesFilter === "week" && grouped[key])
        grouped[key].total += Number(s.total_amount);
      else if (salesFilter === "month" && date.getMonth() === now.getMonth()) {
        const week = Math.ceil(date.getDate() / 7);
        if (grouped[`W${week}`])
          grouped[`W${week}`].total += Number(s.total_amount);
      } else if (salesFilter === "year") {
        const mKey = key.substring(0, 7);
        if (grouped[mKey]) grouped[mKey].total += Number(s.total_amount);
      }
    });

    return Object.values(grouped).map((i) => ({
      name: i.name,
      sales: i.total,
    }));
  }, [sales, salesFilter]);

  const topItemsData = useMemo(() => {
    const now = new Date();

    let cutoffStr: string;

    if (topItemsFilter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      cutoffStr = startOfWeek.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } else if (topItemsFilter === "month") {
      cutoffStr = new Date(now.getFullYear(), now.getMonth(), 1)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    } else {
      cutoffStr = new Date(now.getFullYear(), 0, 1)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    }

    const itemMap: Record<string, number> = {};

    sales
      .filter((s: Sale) => {
        // ✅ เปรียบ date string ตรงๆ "YYYY-MM-DD" >= "YYYY-MM-DD" แม่นยำกว่า
        const saleDateStr = s.created_at.split("T")[0];
        return saleDateStr >= cutoffStr;
      })
      .forEach((s: Sale) => {
        s.items?.forEach((item) => {
          const name = item.product?.name || "Unknown";
          itemMap[name] = (itemMap[name] || 0) + item.quantity;
        });
      });

    return Object.entries(itemMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [sales, topItemsFilter]);

  const stats = [
    {
      id: 1,
      title: "Today's Sales",
      value: `฿${formatPrice(serverStats.todaySales)}`,
      color: "#0FC843",
      icon: TrendingUp,
    },
    {
      id: 2,
      title: "Low Stock Items",
      value: serverStats.lowStockCount,
      color: "#EF8225",
      icon: PackageMinus,
    },
    {
      id: 3,
      title: "Expiring Soon",
      value: serverStats.expiringCount,
      color: "#DB3935",
      icon: ClockAlert,
    },
    {
      id: 4,
      title: "Total Inventory",
      value: `${serverStats.totalInventory.toLocaleString()} Pcs`,
      color: "#0EA5E9",
      icon: PackageOpen,
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <h1 className="text-[29px] font-bold text-gray-800">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {stats.map((s) => (
          <Cards key={s.id} {...s} bgColor={s.color} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-3">
        <ChartContainer
          title="Sales Trends"
          filterValue={salesFilter}
          onFilterChange={(v: string) => setSalesFilter(v as any)}
          filterOptions={TIME_OPTIONS}
        >
          <SalesChart sales={salesChartData} />
        </ChartContainer>

        <ChartContainer
          title="Top Sellers"
          filterValue={topItemsFilter}
          onFilterChange={(v: string) => setTopItemsFilter(v as any)}
          filterOptions={TIME_OPTIONS}
        >
          <TopChart data={topItemsData} />
        </ChartContainer>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-[#EBF4FF] shadow-sm">
        <ReceiptTable onDelete={handleDeleteReceipt} />
      </div>
    </div>
  );
}