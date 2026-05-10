"use server";

import { createClient } from "../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteProductAction(id: number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_product", { p_product_id: id });
    if (error) throw error;
    revalidatePath("/inventory");
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false, error: "Failed to delete product." };
  }
}

export async function addProductAction(formData: any) {
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert([{
    name: formData.name,
    brand: formData.brand || null,
    category_id: formData.category_id,
    price: formData.price,
    min_stock: formData.min_stock,
  }]);
  
  if (error) {
    if (error.code === "23505") {
      throw new Error("Error: This product name/brand is already in use.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/inventory");
  return { success: true };
}

export async function getCategoriesAction() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  
  return data;
}

