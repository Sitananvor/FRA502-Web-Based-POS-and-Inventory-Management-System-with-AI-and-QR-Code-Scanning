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

  let dbQuery = supabase
    .from("products")
    .select("id, qr_code, name, brand, category_id, price, min_stock, inventory_batches(id, stock_amount, expiry_date, received_date), categories(id, name)")
    .order("id", { ascending: true });

  if (query) {
    const isNum = !isNaN(Number(query)) && query !== "";
    if (isNum) {
      dbQuery = dbQuery.or(`id.eq.${Number(query)},price.eq.${Number(query)}`);
    } else {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
    }
  }

  const { data: raw, error } = await dbQuery;
  if (error) console.error("[InventoryPage]", error.message);

  let filtered = (raw ?? []) as unknown as Product[];

  // filter category และ stock client-side
  if (query && filtered.length > 0) {
    const isNum = !isNaN(Number(query)) && query !== "";
    const lower = query.toLowerCase();

    filtered = filtered.filter((p) => {
      if (!isNum) {
        return (
          p.name?.toLowerCase().includes(lower) ||
          p.brand?.toLowerCase().includes(lower) ||
          p.categories?.name?.toLowerCase().includes(lower)
        );
      } else {
        const num = Number(query);
        const stock = (p.inventory_batches ?? []).reduce((s, b) => s + (b.stock_amount || 0), 0);
        return p.id === num || Number(p.price) === num || stock === num;
      }
    });
  }

  const { data: globalStock } = await supabase.rpc('get_total_global_stock');
  const totalGlobalStock = Number(globalStock || 0);

  const totalRows = filtered.length;
  const from = (currentPage - 1) * PAGE_SIZE;
  const products = filtered.slice(from, from + PAGE_SIZE);

  return (
    <InventoryClient
      products={products}
      totalRows={totalRows}
      currentPage={currentPage}
      searchQuery={query}
      pageSize={PAGE_SIZE}
      totalGlobalStock={totalGlobalStock}
    />
  );
}