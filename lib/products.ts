import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

const PRODUCT_COLUMNS = "id, slug, name, description, category, price_kobo, stock, image_url, accent";

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load products: ${error.message}`);
  return data ?? [];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load product: ${error.message}`);
  return data;
}
