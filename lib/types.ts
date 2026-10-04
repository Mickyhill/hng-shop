export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_kobo: number;
  stock: number;
  image_url: string | null;
  accent: string;
};

export type OrderItem = {
  id: string;
  product_name: string;
  unit_price_kobo: number;
  quantity: number;
  line_total_kobo: number;
};

export type Order = {
  id: string;
  order_number: string;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  status: "pending" | "paid" | "shipped" | "cancelled";
  subtotal_kobo: number;
  shipping_kobo: number;
  total_kobo: number;
  created_at: string;
  order_items?: OrderItem[];
};

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  accent: string;
  quantity: number;
};
