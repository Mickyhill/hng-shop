import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatKobo } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

export const metadata: Metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; email?: string }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { placed, email } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, email, full_name, phone, address, city, status, subtotal_kobo, shipping_kobo, total_kobo, created_at, order_items (id, product_name, unit_price_kobo, quantity, line_total_kobo)",
    )
    .eq("id", id)
    .maybeSingle<Order & { order_items: OrderItem[] }>();

  if (error) throw new Error(`Could not load order: ${error.message}`);
  // RLS hides other people's orders, so "not yours" also lands here.
  if (!order) notFound();

  return (
    <div className="container section narrow">
      {placed && (
        <div className="alert alert-success" role="status">
          <strong>Order placed.</strong>{" "}
          {email === "failed"
            ? "Your order is saved, but the confirmation email could not be sent right now."
            : `A confirmation email is on its way to ${order.email}.`}
        </div>
      )}

      <p className="eyebrow">Order {order.order_number}</p>
      <h1 className="page-title">Thank you, {order.full_name.split(" ")[0]}.</h1>
      <p className="muted">
        Placed on {formatDate(order.created_at)} ·{" "}
        <span className={`status status-${order.status}`}>{order.status}</span>
      </p>

      <div className="card order-card">
        <ul className="summary-items">
          {order.order_items.map((item) => (
            <li key={item.id}>
              <span>
                {item.product_name} <span className="muted">× {item.quantity}</span>
              </span>
              <span>{formatKobo(item.line_total_kobo)}</span>
            </li>
          ))}
        </ul>
        <dl className="summary-rows">
          <div>
            <dt>Subtotal</dt>
            <dd>{formatKobo(order.subtotal_kobo)}</dd>
          </div>
          <div>
            <dt>Shipping</dt>
            <dd>{order.shipping_kobo === 0 ? "Free" : formatKobo(order.shipping_kobo)}</dd>
          </div>
          <div className="summary-total">
            <dt>Total</dt>
            <dd>{formatKobo(order.total_kobo)}</dd>
          </div>
        </dl>
      </div>

      <div className="card order-card">
        <h2 className="summary-title">Delivery</h2>
        <p>
          {order.full_name}
          <br />
          {order.address}
          <br />
          {order.city}
          <br />
          {order.phone}
        </p>
      </div>

      <div className="actions-row">
        <Link href="/orders" className="btn btn-outline">
          All orders
        </Link>
        <Link href="/" className="btn btn-primary">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
