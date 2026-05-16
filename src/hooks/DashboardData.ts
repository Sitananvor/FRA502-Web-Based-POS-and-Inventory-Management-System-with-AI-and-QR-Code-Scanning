"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../lib/supabase/client"; 
import type { Product, Sale } from "../../src/types";

export function DashboardData(
  salesFilter: "week" | "month" | "year",
  topItemsFilter: "week" | "month" | "year",
  initialData: { products: Product[]; sales: Sale[]; todaySales: number },
) {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [sales, setSales] = useState<Sale[]>(initialData.sales);
  const [todaySales, setTodaySales] = useState<number>(initialData.todaySales);

  useEffect(() => {
    setProducts(initialData.products);
    setSales(initialData.sales);
    setTodaySales(initialData.todaySales);
  }, [initialData]);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, brand, price, min_stock, batches:inventory_batches(id, stock_amount, expiry_date)",
      );
    if (data) setProducts(data as unknown as Product[]);
  }, [supabase]); 

  const loadSales = useCallback(async () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const startDate = `${startOfYear}T00:00:00+07:00`;

    const { data, error } = await supabase
      .from("sales")
      .select(
        "id, created_at, total_amount, items:sales_items!sales_items_sale_id_fkey(id, quantity, product:products!sales_items_product_id_fkey(name))",
      )
      .gte("created_at", startDate)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Query Error:", error.message);
    }

    if (data) setSales(data as unknown as Sale[]);
  }, [supabase]);

  const loadTodaySales = useCallback(async () => {
    const todayDate = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    });

    const { data } = await supabase
      .from("sales")
      .select("total_amount")
      .gte("created_at", `${todayDate}T00:00:00+07:00`)
      .lte("created_at", `${todayDate}T23:59:59+07:00`);

    const total = (data || []).reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0,
    );
    setTodaySales(total);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_batches" },
        loadProducts,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          loadTodaySales();
          loadSales();
        },
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts, loadTodaySales, loadSales, supabase]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    console.log("sales updated, sample items:", sales[0]?.items);
  }, [sales]);

  const deleteReceipt = async (id: number) => {
    setSales((prevSales) => prevSales.filter((sale) => sale.id !== id));

    const { error } = await supabase.rpc("delete_sale", { p_sale_id: id });
    
    if (error) {
      loadSales(); 
    }
    
    return { error };
  };

  return { products, sales, todaySales, deleteReceipt };
}