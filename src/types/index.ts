export interface Category {
  id: number; 
  name: string;
  products?: Product[];
}

export interface Product {
  id: number;
  qr_code: string | null;
  name: string;
  brand: string | null;
  category_id: number;
  price: number; 
  min_stock: number;
  categories?: Category; 
  inventory_batches?: InventoryBatch[]; 
  sales_items?: SalesItem[];
}

export interface InventoryBatch {
  id: number;
  product_id: number;
  batch_number: string | null;
  batch_qr: string | null;
  stock_amount: number;
  received_date: string;
  expiry_date: string | null;
  product?: Product;
  sales_items?: SalesItem[];
}

export interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  items?: SalesItem[];
}

export interface SalesItem {
  id: number;
  sale_id: number;
  product_id: number;
  batch_id: number | null;
  quantity: number;
  price_at_time: number;
  sale?: Sale;
  product?: Product;
  batch?: InventoryBatch;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}