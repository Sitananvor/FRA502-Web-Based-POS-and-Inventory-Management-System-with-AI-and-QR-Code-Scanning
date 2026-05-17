"use server";

import { supabase } from "../lib/supabase";

export async function getPagedReceiptsAction(page: number = 1, pageSize: number = 10) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("sales")
    .select('*', { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const { data: grandTotal } = await supabase.rpc('get_grand_total');

  return { 
    success: true, 
    data: data || [], 
    totalCount: count || 0,
    grandTotal: grandTotal || 0 
  };
}