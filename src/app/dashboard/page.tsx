import DashboardClient from "./DashboardClient";
import { supabase } from "../../lib/supabase";
import { getDashboardData } from "../../lib/data"; 
import { calcTotalStock, getLowStockCount, getExpiringCount } from "../../lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();

  const startOfYear = new Date(now.getFullYear(), 0, 1)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

  // ดึงข้อมูลดิบจาก Database
  const initialData = await getDashboardData(`${startOfYear}T00:00:00+07:00`);

  // คำนวณข้อมูลสำหรับ Cards บน Server
  const { products, todaySales } = initialData;
  const lowStockCount = getLowStockCount(products);
  const expiringCount = getExpiringCount(products);
  const totalInventory = products.reduce(
    (t: number, p: any) => t + calcTotalStock(p.inventory_batches ?? []), 
    0
  );

  // แพ็คข้อมูลที่คำนวณแล้วเตรียมส่งให้ Client
  const serverStats = {
    todaySales,
    lowStockCount,
    expiringCount,
    totalInventory
  };

  return (
    <DashboardClient 
      initialData={initialData} 
      serverStats={serverStats}
    />
  );
}