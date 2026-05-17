import { supabase } from "../../lib/supabase";
import InventoryClient from "./InventoryClient";
import type { Product } from "../../types";

export const revalidate = 0;

const SELECT_FIELDS =
  "id, qr_code, name, brand, category_id, price, min_stock, inventory_batches(id, stock_amount, expiry_date, received_date), categories(id, name)";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.query?.trim() || "";
  const currentPage = Number(resolvedParams?.page) || 1;
  const PAGE_SIZE = 20;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const isNum = query !== "" && !isNaN(Number(query));
  const lower = query.toLowerCase();

  let finalProducts: Product[] = [];
  let totalRows = 0;

  if (!query) {
    // ── ไม่มี query: ให้ DB paginate โดยตรง (query เดียว) ──────────────────
    const { data, error, count } = await supabase
      .from("products")
      .select(SELECT_FIELDS, { count: "exact" })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) console.error("[InventoryPage]", error.message);
    finalProducts = (data ?? []) as unknown as Product[];
    totalRows = count ?? 0;
  } else {
    // ── มี query: ดึงทั้งหมดก่อน แล้ว filter + paginate ใน memory ──────────
    let dbQuery = supabase
      .from("products")
      .select(SELECT_FIELDS)
      .order("id", { ascending: true });

    if (isNum) {
      dbQuery = dbQuery.or(`id.eq.${Number(query)},price.eq.${Number(query)}`);
    } else {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%,qr_code.ilike.%${query}%`);
    }

    const { data: raw, error } = await dbQuery;
    if (error) console.error("[InventoryPage]", error.message);

    let filtered = (raw ?? []) as unknown as Product[];

    // เพิ่มผลจาก category filter (ที่ DB ทำไม่ได้)
    if (!isNum) {
      const ids = new Set(filtered.map((p) => p.id));
      // ดึงทุก product แล้วหาที่ category ตรง (ยังไม่อยู่ใน filtered)
      const { data: allForCat } = await supabase
        .from("products")
        .select(SELECT_FIELDS)
        .ilike("categories.name", `%${query}%`)
        .order("id", { ascending: true });

      (allForCat ?? []).forEach((p: any) => {
        if (
          p.categories?.name?.toLowerCase().includes(lower) &&
          !ids.has(p.id)
        ) {
          filtered.push(p as unknown as Product);
          ids.add(p.id);
        }
      });
    }

    // เพิ่มผลจาก stock filter (ที่ DB ทำไม่ได้)
    if (isNum) {
      const num = Number(query);
      const { data: allForStock } = await supabase
        .from("products")
        .select(SELECT_FIELDS)
        .order("id", { ascending: true });

      const ids = new Set(filtered.map((p) => p.id));
      (allForStock ?? []).forEach((p: any) => {
        const stock = ((p as Product).inventory_batches ?? []).reduce(
          (s, b) => s + (b.stock_amount || 0),
          0
        );
        if (stock === num && !ids.has((p as Product).id)) {
          filtered.push(p as unknown as Product);
          ids.add((p as Product).id);
        }
      });
    }

    totalRows = filtered.length;
    finalProducts = filtered.slice(from, from + PAGE_SIZE);
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