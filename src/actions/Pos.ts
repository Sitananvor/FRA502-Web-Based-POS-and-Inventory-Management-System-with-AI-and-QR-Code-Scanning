"use server";

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from "../lib/supabase";

/**
 * Resolves a scanned/typed code to a product + batches.
 * Resolution order (stops at first match):
 *  1. batch_qr      — exact match  (QR scanner on a batch label)
 *  2. product qr_code — exact match  (QR scanner on a product label)
 *  3. batch_number  — exact match (case-insensitive)
 *  4. product name  — exact match (case-insensitive)
 *
 * NOTE: No partial / substring / full-text search intentionally —
 * staff must type the full exact name or scan the QR code.
 */
export async function resolveScannedCodeAction(code: string) {
  try {
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

    // 3. batch_number — exact match (case-insensitive)
    const { data: batchByNumber, error: e3 } = await supabase
      .from("inventory_batches")
      .select("*")
      .ilike("batch_number", trimmed)
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

    // 4. Product name — exact match (case-insensitive)
    const { data: productByName, error: e4 } = await supabase
      .from("products")
      .select("id, name, price")
      .ilike("name", trimmed)
      .maybeSingle();

    if (e4 && e4.code !== "PGRST116") throw new Error(e4.message);

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
  supabase: SupabaseClient,
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