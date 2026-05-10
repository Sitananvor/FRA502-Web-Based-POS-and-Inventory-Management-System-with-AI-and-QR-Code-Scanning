import { createClient } from "../../lib/supabase/server";
import InventoryClient from "./InventoryClient";
import type { Product } from "../../types";

export const revalidate = 0;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const query = resolvedParams?.query?.trim() || "";
  const currentPage = Number(resolvedParams?.page) || 1;
  const PAGE_SIZE = 20;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const isNum = query !== "" && !isNaN(Number(query));
  const lower = query.toLowerCase();

  // ดึงข้อมูลพร้อม count จาก DB เลย ไม่ต้อง slice ใน memory
  let dbQuery = supabase
    .from("products")
    .select(
      "id, qr_code, name, brand, category_id, price, min_stock, inventory_batches(id, stock_amount, expiry_date, received_date), categories(id, name)",
      { count: "exact" }
    )
    .order("id", { ascending: true });

  if (query) {
    if (isNum) {
      // ค้นหาด้วย id หรือ price ผ่าน DB
      dbQuery = dbQuery.or(`id.eq.${Number(query)},price.eq.${Number(query)}`);
    } else {
      // ค้นหา name, brand ผ่าน DB (category ยังต้อง client-side เพราะเป็น relation)
      dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
    }
  }

  const { data: raw, error, count } = await dbQuery;

  if (error) console.error("[InventoryPage]", error.message);

  let filtered = (raw ?? []) as unknown as Product[];

  // กรณีค้นหา text → เพิ่ม filter category ที่ DB ทำไม่ได้
  if (query && !isNum && filtered.length > 0) {
    const withCategory = filtered.filter((p) =>
      p.categories?.name?.toLowerCase().includes(lower)
    );

    // ถ้า category match มีเพิ่มเติม → รวมกัน (deduplicate)
    if (withCategory.length > 0) {
      const ids = new Set(filtered.map((p) => p.id));
      withCategory.forEach((p) => {
        if (!ids.has(p.id)) filtered.push(p);
      });
    }
  }

  // กรณีค้นหาตัวเลข → เพิ่ม filter stock ที่ DB ทำไม่ได้
  if (query && isNum) {
    const num = Number(query);
    const withStock = filtered.filter((p) => {
      const stock = (p.inventory_batches ?? []).reduce(
        (s, b) => s + (b.stock_amount || 0),
        0
      );
      return stock === num;
    });

    if (withStock.length > 0) {
      const ids = new Set(filtered.map((p) => p.id));
      withStock.forEach((p) => {
        if (!ids.has(p.id)) filtered.push(p);
      });
    }
  }

  const totalRows = filtered.length > 0 ? filtered.length : (count ?? 0);

  // Paginate หลัง filter เฉพาะกรณีที่มีการ filter เพิ่มใน memory
  // ถ้าไม่มี query → ใช้ range จาก DB โดยตรง 
  const products = query ? filtered.slice(from, from + PAGE_SIZE) : filtered;

  // ถ้าไม่มี query → ดึง range จาก DB ตรงๆ
  let finalProducts = products;
  if (!query) {
    const { data: paged } = await supabase
      .from("products")
      .select(
        "id, qr_code, name, brand, category_id, price, min_stock, inventory_batches(id, stock_amount, expiry_date, received_date), categories(id, name)"
      )
      .order("id", { ascending: true })
      .range(from, to);
    finalProducts = (paged ?? []) as unknown as Product[];
  }

  const { data: globalStock } = await supabase.rpc("get_total_global_stock");
  const totalGlobalStock = Number(globalStock || 0);

  return (
    <InventoryClient
      products={finalProducts}
      totalRows={totalRows}
      currentPage={currentPage}
      searchQuery={query}
      pageSize={PAGE_SIZE}
      totalGlobalStock={totalGlobalStock}
    />
  );
}