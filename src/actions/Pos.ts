"use server";

import { createClient } from "../lib/supabase/server";

/**
 * Resolves a scanned/typed code to a product + batches.
 * Resolution order (stops at first match):
 *  1. batch_qr     — exact match  (QR scanner on a batch label)
 *  2. product qr_code — exact match  (QR scanner on a product label)
 *  3. batch_number — ilike           (staff types a lot/batch number)  ← FIX: was missing
 *  4. product name — full-text search via tsvector (fast, typo-tolerant prefix)
 *  5. product name — ilike fallback  (substring, handles short strings tsvector skips)
 */
export async function resolveScannedCodeAction(code: string) {
  try {
    const supabase = await createClient();
    const trimmed = code.trim();

    // 1. Exact batch QR
    const { data: batchByQR, error: e1 } = await supabase
      .from("inventory_batches")
      .select("*")
      .eq("batch_qr", trimmed)
      .maybeSingle();

    if (e1 && e1.code !== "PGRST116") throw new Error(e1.message);

    if (batchByQR) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("id", batchByQR.product_id)
        .single();
      return { success: true, product, batches: [batchByQR], isBatchScan: true };
    }

    // 2. Exact product QR code
    const { data: productByQR, error: e2 } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("qr_code", trimmed)
      .maybeSingle();

    if (e2 && e2.code !== "PGRST116") throw new Error(e2.message);

    if (productByQR) {
      return await fetchProductWithBatches(supabase, productByQR);
    }

    // 3. batch_number ilike — e.g. staff types "LOT-2024-001"
    const { data: batchByNumber, error: e3 } = await supabase
      .from("inventory_batches")
      .select("*")
      .ilike("batch_number", `%${trimmed}%`)
      .limit(1)
      .maybeSingle();

    if (e3 && e3.code !== "PGRST116") throw new Error(e3.message);

    if (batchByNumber) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("id", batchByNumber.product_id)
        .single();
      return { success: true, product, batches: [batchByNumber], isBatchScan: true };
    }

    // 4. Full-text search on products (uses search_vector GIN index)
    const tsQuery = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(" & ");

    const { data: ftsList } = await supabase
      .from("products")
      .select("id, name, price")
      .textSearch("search_vector", tsQuery, { config: "simple" })
      .limit(1);

    const productByFTS = ftsList?.[0] ?? null;

    if (productByFTS) {
      return await fetchProductWithBatches(supabase, productByFTS);
    }

    // 5. ilike fallback on product name (handles short / symbol / number strings)
    const { data: nameList } = await supabase
      .from("products")
      .select("id, name, price")
      .ilike("name", `%${trimmed}%`)
      .limit(1);

    const productByName = nameList?.[0] ?? null;

    if (productByName) {
      return await fetchProductWithBatches(supabase, productByName);
    }

    // Not found
    return { success: false, error: `No product found for "${trimmed}"` };

  } catch (error: any) {
    console.error("Resolve QR error:", error);
    return { success: false, error: error.message };
  }
}

//  Helper: fetch a product's batches and return the standard shape 
async function fetchProductWithBatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  product: { id: number; name: string; price: number },
) {
  const { data: batches } = await supabase
    .from("inventory_batches")
    .select("id, stock_amount, expiry_date")
    .eq("product_id", product.id);

  return {
    success: true,
    product,
    batches: batches ?? [],
    isBatchScan: false,
  };
}

// Checkout
export async function processCheckoutAction(payload: any[]) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("process_checkout", {
      p_items: payload,
    });

    if (error) throw error;

    return { success: true, saleId: data.sale_id };
  } catch (error: any) {
    console.error("Checkout error:", error);
    return { success: false, error: error.message };
  }
}