import { supabase } from "../../../../lib/supabase";
import BatchClient from "./BatchClient";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function BatchManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedParams = await params;
  const productId = Number(resolvedParams.id);
  
  const resolvedSearch = await searchParams;
  const currentPage = Number(resolvedSearch?.page) || 1;
  const PAGE_SIZE = 15; // จำนวนแถวต่อหน้า

  if (isNaN(productId)) return notFound();

  // ดึงข้อมูลสินค้า (เพื่อเอาชื่อและแบรนด์ไปโชว์ที่ Header)
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, brand")
    .eq("id", productId)
    .single();

  if (productError || !product) return notFound();

  // ดึงข้อมูลล็อต (Batches) ของสินค้านี้ พร้อมทำ Pagination ฝั่ง Server
  const { data: batches, error: batchesError, count } = await supabase
    .from("inventory_batches")
    .select("*", { count: "exact" })
    .eq("product_id", productId)
    .order("expiry_date", { ascending: true }) // เรียงล็อตที่ใกล้หมดอายุขึ้นก่อน
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  if (batchesError) console.error("[BatchManagementPage]", batchesError.message);

  // เรียก RPC ให้ Database คำนวณยอดสต็อกรวมของ "สินค้านี้"
  const { data: productStock } = await supabase.rpc('get_product_total_stock', { p_product_id: productId });

  return (
    <BatchClient
      productId={productId}
      productName={product.name}
      productBrand={product.brand}
      initialBatches={batches || []}
      totalRows={count || 0}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      totalProductStock={Number(productStock || 0)}
    />
  );
}