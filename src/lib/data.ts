import { createClient } from "../lib/supabase/client";
import type { Product, InventoryBatch, Sale, Category } from "../types";

// Products
export async function getProducts(page = 1, search = "", pageSize = 20) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "*, inventory_batches(id, stock_amount), category:categories(name)",
      { count: "exact" },
    )
    .order("id", { ascending: true })
    .range(from, to);

  if (search) {
    query = query.textSearch("search_vector", search, {
      config: "simple",
      type: "websearch",
    });
  }
  const { data, count, error } = await query;
  if (error) throw error;

  return { data: (data ?? []) as unknown as Product[], total: count ?? 0 };
}

// Batches
export async function getBatches(
  productId: number,
  page = 1,
  search = "",
  pageSize = 20,
) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("inventory_batches")
    .select("*, product:products(name, brand)", { count: "exact" })
    .eq("product_id", productId)
    .order("id", { ascending: true })
    .range(from, to);

  if (search) {
    query = query.textSearch("search_vector", search, {
      config: "simple",
      type: "websearch",
    });
  }
  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []) as unknown as InventoryBatch[], total: count ?? 0 };
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

// Dashboard
export async function getDashboardData(startDate: string) {
  const supabase = await createClient();
  
  const todayDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  });

  const [productsRes, todaySalesRes, salesRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, min_stock, inventory_batches(stock_amount, expiry_date)"),
    supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", `${todayDate}T00:00:00+07:00`)
      .lte("created_at", `${todayDate}T23:59:59+07:00`),
    supabase
      .from("sales")
      .select(
        "id, created_at, total_amount, items:sales_items!sales_items_sale_id_fkey(id, quantity, product:products!sales_items_product_id_fkey(name))",
      )
      .gte("created_at", startDate) 
      .order("created_at", { ascending: false }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (todaySalesRes.error) throw todaySalesRes.error;
  if (salesRes.error) throw salesRes.error;

  const todaySales = (todaySalesRes.data ?? []).reduce(
    (sum, s) => sum + Number(s.total_amount || 0),
    0,
  );

  return {
    products: (productsRes.data ?? []) as unknown as Product[],
    todaySales,
    sales: (salesRes.data ?? []) as unknown as Sale[],
  };
}