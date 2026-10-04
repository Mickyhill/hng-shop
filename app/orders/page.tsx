import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatKobo } from "@/lib/format";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createClient();
  // Row Level Security returns only this user's orders.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_kobo, created_at")
    .order("created_at", { ascending: false })
    .returns<Pick<Order, "id" | "order_number" | "status" | "total_kobo" | "created_at">[]>();

  if (error) throw new Error(`Could not load orders: ${error.message}`);

  return (
    <div className="container section">
      <h1 className="page-title">Your orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No orders yet</p>
          <Link href="/" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="order-row">
                <span className="order-number">{o.order_number}</span>
                <span className="muted">{formatDate(o.created_at)}</span>
                <span className={`status status-${o.status}`}>{o.status}</span>
                <span className="price">{formatKobo(o.total_kobo)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
