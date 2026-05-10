"use server";

import { createClient } from "../lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addBatchAction(formData: any) {
  const supabase = await createClient();
  
  const { error } = await supabase.from("inventory_batches").insert([
    {
      product_id: formData.product_id,
      batch_number: formData.batch_number,
      batch_qr: formData.batch_qr,
      stock_amount: formData.stock_amount,
      received_date: formData.received_date,
      expiry_date: formData.expiry_date,
    },
  ]);
  
  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("batch_qr")) {
        return { success: false, error: "This batch QR code is already in use." };
      }
      return { success: false, error: "This batch number is already in use." }
    }
    return { success: false, error: error.message };
  }
  
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${formData.product_id}/batches`, "page"); 
  
  return { success: true };
}

export async function deleteBatchAction(id: number) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("inventory_batches")
      .delete()
      .eq("id", id);
      
    if (error) {
    if (error.code === "23505") {
      throw new Error("This batch no. or batch QR is already in use.");
    }
    throw new Error(error.message);
  }
    
    revalidatePath("/inventory");
    revalidatePath("/inventory/[id]/batches", "page");
    
    return { success: true };
  } catch (error: any) {
    console.error("Delete batch error:", error);
    return { success: false, error: error.message || "Failed to delete batch." };
  }
}